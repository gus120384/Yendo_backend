// tests/pedido.test.js
const request = require('supertest');
const app = require('../app');
const { User, Pedido, sequelize } = require('../models'); // sequelize aquí es la instancia
const { Op } = require('sequelize');

const createUserAndLogin = async (userData) => {
  const t = await sequelize.transaction();
  try {
    await User.destroy({ where: { email: userData.email }, force: true, transaction: t });
    const user = await User.create(userData, { transaction: t });
    await t.commit();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: userData.email, password: userData.password });

    if (!loginResponse.body.token) {
      console.error('Fallo al loguear usuario para prueba de pedido:', userData.email, loginResponse.body);
      throw new Error(`No se pudo obtener token para ${userData.email}`);
    }
    return { token: loginResponse.body.token, user };
  } catch (error) {
    await t.rollback();
    console.error(`Error en createUserAndLogin para ${userData.email}:`, error.name, error.message);
    if (error.original) console.error('Error Original (BD) en createUserAndLogin:', error.original);
    if (error.fields) console.error('Campos del Error en createUserAndLogin:', error.fields);
    throw error;
  }
};


describe('Pedido Routes - /api/pedidos', () => {
  let clienteToken, clienteUser;
  let tecnicoToken, tecnicoUser;
  let adminToken, adminUser;
  let cliente2Token, cliente2User;
  let tecnico2Token, tecnico2User;

  const clienteData = { nombre: 'ClientePedido', apellido: 'Test', email: 'cliente.pedido@example.com', password: 'Password123!', rol: 'cliente' };
  const tecnicoData = { nombre: 'TecnicoPedido', apellido: 'Test', email: 'tecnico.pedido@example.com', password: 'Password123!', rol: 'tecnico' };
  const adminData = { nombre: 'AdminPedido', apellido: 'Test', email: 'admin.pedido@example.com', password: 'Password123!', rol: 'administrador' };
  const cliente2Data = { nombre: 'ClienteDos', apellido: 'Listas', email: 'cliente2.listas@example.com', password: 'Password123!', rol: 'cliente' };
  const tecnico2Data = { nombre: 'TecnicoDos', apellido: 'Listas', email: 'tecnico2.listas@example.com', password: 'Password123!', rol: 'tecnico' };

  const basePedidoData = {
    descripcion_problema: 'Mi lavadora no enciende y hace ruidos extraños.',
    direccion_servicio_calle: 'Calle Falsa',
    direccion_servicio_numero: '123',
    direccion_servicio_ciudad: 'Springfield',
    direccion_servicio_provincia: 'Estado Cualquiera',
    direccion_servicio_cp: '12345',
  };

  let pedidoCliente1_Pendiente_ID, pedidoCliente1_AsignadoTecnico1_ID, pedidoCliente1_Completado_ID;
  let pedidoCliente2_Pendiente_ID, pedidoCliente2_AsignadoTecnico2_ID_EnProgreso;
  let pedidoParaBorrarAdmin_ID, pedidoParaReactivarAdmin_ID;


  beforeAll(async () => {
    try {
      const userTableName = User.getTableName(); 
      const pedidoTableName = Pedido.getTableName();
      await sequelize.query(`TRUNCATE TABLE "${pedidoTableName}" RESTART IDENTITY CASCADE;`);
      await sequelize.query(`TRUNCATE TABLE "${userTableName}" RESTART IDENTITY CASCADE;`);

      const clienteLogin = await createUserAndLogin(clienteData);
      clienteToken = clienteLogin.token;
      clienteUser = clienteLogin.user;

      const tecnicoLogin = await createUserAndLogin(tecnicoData);
      tecnicoToken = tecnicoLogin.token;
      tecnicoUser = tecnicoLogin.user;

      const adminLogin = await createUserAndLogin(adminData);
      adminToken = adminLogin.token;
      adminUser = adminLogin.user;

      const cliente2Login = await createUserAndLogin(cliente2Data);
      cliente2Token = cliente2Login.token;
      cliente2User = cliente2Login.user;

      const tecnico2Login = await createUserAndLogin(tecnico2Data);
      tecnico2Token = tecnico2Login.token;
      tecnico2User = tecnico2Login.user;

      const p1 = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, descripcion_problema: 'C1 Pendiente Activo', estado: 'pendiente_asignacion', activo: true });
      pedidoCliente1_Pendiente_ID = p1.id;
      const p2 = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, tecnico_id: tecnicoUser.id, descripcion_problema: 'C1 Asignado T1 Activo', estado: 'asignado', activo: true });
      pedidoCliente1_AsignadoTecnico1_ID = p2.id;
      const p3 = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, tecnico_id: tecnicoUser.id, descripcion_problema: 'C1 Completado T1 Activo', estado: 'completado', activo: true });
      pedidoCliente1_Completado_ID = p3.id;
      const p4 = await Pedido.create({ ...basePedidoData, cliente_id: cliente2User.id, descripcion_problema: 'C2 Pendiente Activo', estado: 'pendiente_asignacion', activo: true });
      pedidoCliente2_Pendiente_ID = p4.id;
      const p5 = await Pedido.create({ ...basePedidoData, cliente_id: cliente2User.id, tecnico_id: tecnico2User.id, descripcion_problema: 'C2 Asignado T2 En Progreso Activo', estado: 'en_progreso', activo: true });
      pedidoCliente2_AsignadoTecnico2_ID_EnProgreso = p5.id;
      const pBorrar = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, descripcion_problema: 'Para Borrar Admin', estado: 'pendiente_asignacion', activo: true });
      pedidoParaBorrarAdmin_ID = pBorrar.id;
      const pReactivar = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, descripcion_problema: 'Para Reactivar Admin', estado: 'completado', activo: false });
      pedidoParaReactivarAdmin_ID = pReactivar.id;
    } catch (error) {
      console.error('ERROR DETALLADO EN BEFOREALL:', error.name, error.message);
      if (error.original) {
          console.error('ERROR ORIGINAL DE BD EN BEFOREALL:', error.original);
          if (error.original.detail) console.error('DETALLE BD:', error.original.detail);
          if (error.original.constraint) console.error('CONSTRAIN VIOLADA:', error.original.constraint);
      }
      if (error.fields) { 
          console.error('CAMPOS DEL ERROR EN BEFOREALL:', error.fields);
      }
      console.error('STACK TRACE DEL ERROR EN BEFOREALL:', error.stack);
      throw error;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/pedidos (pedidoController.createPedido)', () => {
    beforeEach(async () => {
        await Pedido.destroy({ where: { 
            cliente_id: clienteUser.id, 
            descripcion_problema: basePedidoData.descripcion_problema 
        }, force: true });
    });

    it('should allow an authenticated cliente to create a new pedido (201 Created) and it should be active', async () => {
      const response = await request(app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send(basePedidoData);
      expect(response.statusCode).toBe(201);
      expect(response.body.status).toBe('success');
      const pedidoCreado = response.body.data.pedido;
      expect(pedidoCreado.cliente_id).toBe(clienteUser.id);
      expect(pedidoCreado.estado).toBe('pendiente_asignacion');
      expect(pedidoCreado.activo).toBe(true);
    });

    it('should return 400 if required fields are missing (e.g., descripcion_problema)', async () => {
      const incompletePedidoData = { ...basePedidoData };
      delete incompletePedidoData.descripcion_problema;
      const response = await request(app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send(incompletePedidoData);
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/descripción del problema es requerida/i); 
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app).post('/api/pedidos').send(basePedidoData);
      expect(response.statusCode).toBe(401);
    });

    it('should return 403 if a non-cliente user (e.g., tecnico) tries to create a pedido', async () => {
      const response = await request(app).post('/api/pedidos').set('Authorization', `Bearer ${tecnicoToken}`).send(basePedidoData);
      expect(response.statusCode).toBe(403);
      expect(response.body.message).toMatch(/No tienes permiso para realizar esta acción/i); 
    });
  });

  describe('GET /api/pedidos/:id (pedidoController.getPedidoById)', () => {
    it('should allow the cliente owner to get their own active pedido (200 OK)', async () => {
        const response = await request(app).get(`/api/pedidos/${pedidoCliente1_Pendiente_ID}`).set('Authorization', `Bearer ${clienteToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedido.id).toBe(pedidoCliente1_Pendiente_ID);
        expect(response.body.data.pedido.activo).toBe(true);
    });
    
    it('should 404 if cliente tries to get their own INACTIVE pedido', async () => {
        await Pedido.update({ activo: false }, { where: { id: pedidoCliente1_Pendiente_ID } });
        const response = await request(app).get(`/api/pedidos/${pedidoCliente1_Pendiente_ID}`).set('Authorization', `Bearer ${clienteToken}`);
        expect(response.statusCode).toBe(404); 
        expect(response.body.message).toMatch(/Este pedido ha sido eliminado y no está accesible/i);
        await Pedido.update({ activo: true }, { where: { id: pedidoCliente1_Pendiente_ID } }); 
    });

    it('should allow an admin to get an INACTIVE pedido (200 OK)', async () => {
        const response = await request(app).get(`/api/pedidos/${pedidoParaReactivarAdmin_ID}`).set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedido.id).toBe(pedidoParaReactivarAdmin_ID);
        expect(response.body.data.pedido.activo).toBe(false);
    });

    it('should return 404 if pedido ID does not exist (integer)', async () => {
        const response = await request(app).get(`/api/pedidos/99999999`).set('Authorization', `Bearer ${clienteToken}`);
        expect(response.statusCode).toBe(404);
        expect(response.body.message).toMatch(/No se encontró ningún pedido con ese ID/i);
    });
    
    it('should return 401 if not authenticated when trying to get a pedido', async () => {
        const response = await request(app).get(`/api/pedidos/${pedidoCliente1_Pendiente_ID}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if another cliente (not owner) tries to get the pedido', async () => {
        const response = await request(app).get(`/api/pedidos/${pedidoCliente1_Pendiente_ID}`).set('Authorization', `Bearer ${cliente2Token}`);
        expect(response.statusCode).toBe(403);
        expect(response.body.message).toMatch(/No tienes permiso para ver este pedido/i); 
    });

    it('should allow an assigned tecnico to get the active pedido (200 OK)', async () => {
        const response = await request(app).get(`/api/pedidos/${pedidoCliente1_AsignadoTecnico1_ID}`).set('Authorization', `Bearer ${tecnicoToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedido.id).toBe(pedidoCliente1_AsignadoTecnico1_ID);
        expect(response.body.data.pedido.tecnico_id).toBe(tecnicoUser.id);
        expect(response.body.data.pedido.activo).toBe(true);
    });
     it('should 404 if an assigned tecnico tries to get an INACTIVE pedido', async () => {
        await Pedido.update({ activo: false }, { where: { id: pedidoCliente1_AsignadoTecnico1_ID } });
        const response = await request(app).get(`/api/pedidos/${pedidoCliente1_AsignadoTecnico1_ID}`).set('Authorization', `Bearer ${tecnicoToken}`);
        expect(response.statusCode).toBe(404);
        expect(response.body.message).toMatch(/Este pedido ha sido eliminado y no está accesible/i);
        await Pedido.update({ activo: true }, { where: { id: pedidoCliente1_AsignadoTecnico1_ID } }); 
    });

    it('should return 403 if a tecnico (not assigned) tries to get an active pedido not assigned to them', async () => {
        const response = await request(app).get(`/api/pedidos/${pedidoCliente2_AsignadoTecnico2_ID_EnProgreso}`).set('Authorization', `Bearer ${tecnicoToken}`);
        expect(response.statusCode).toBe(403); 
        expect(response.body.message).toMatch(/No tienes permiso para ver este pedido/i); 
    });

    it('should allow an administrador to get any active pedido (200 OK)', async () => {
        let response = await request(app).get(`/api/pedidos/${pedidoCliente1_Pendiente_ID}`).set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        response = await request(app).get(`/api/pedidos/${pedidoCliente2_AsignadoTecnico2_ID_EnProgreso}`).set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /api/pedidos (pedidoController.getAllPedidos)', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/pedidos');
      expect(response.statusCode).toBe(401);
    });

    describe('como Cliente', () => {
      it('cliente1 should get only their own ACTIVE pedidos', async () => {
        const tempInactivePedido = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, descripcion_problema: 'C1 Inactivo Temp', estado: 'completado', activo: false });
        const response = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${clienteToken}`); 
        expect(response.statusCode).toBe(200);
        // clienteUser tiene p1, p2, p3, y pBorrar activos = 4 pedidos
        expect(response.body.data.pedidos.length).toBe(4); 
        response.body.data.pedidos.forEach(pedido => {
            expect(pedido.cliente_id).toBe(clienteUser.id);
            expect(pedido.activo).toBe(true);
        });
        await Pedido.destroy({ where: { id: tempInactivePedido.id }, force: true });
      });
      
      it('cliente2 should get only their own ACTIVE pedidos', async () => {
        const response = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${cliente2Token}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedidos.length).toBe(2); 
        response.body.data.pedidos.forEach(pedido => {
            expect(pedido.cliente_id).toBe(cliente2User.id);
            expect(pedido.activo).toBe(true);
        });
      });
    });

    describe('como Tecnico', () => {
      it('tecnico1 should get their assigned ACTIVE pedidos AND all ACTIVE "pendiente_asignacion" pedidos', async () => {
        const tempInactivePedido = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, tecnico_id: tecnicoUser.id, descripcion_problema: 'T1 Inactivo Asignado Temp', estado: 'asignado', activo: false });
        const response = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${tecnicoToken}`);
        expect(response.statusCode).toBe(200);
        const pedidos = response.body.data.pedidos;
        const idsEsperados = [
            pedidoCliente1_AsignadoTecnico1_ID, 
            pedidoCliente1_Completado_ID, 
            pedidoCliente1_Pendiente_ID, 
            pedidoCliente2_Pendiente_ID,
            pedidoParaBorrarAdmin_ID 
        ].sort((a, b) => a - b); // Asegurar orden numérico para la comparación
        const idsRecibidos = pedidos.map(p => p.id).sort((a, b) => a - b);
        
        expect(idsRecibidos).toEqual(idsEsperados);
        pedidos.forEach(pedido => {
            expect(pedido.activo).toBe(true);
            expect(pedido.tecnico_id === tecnicoUser.id || pedido.estado === 'pendiente_asignacion').toBe(true);
        });
        await Pedido.destroy({ where: { id: tempInactivePedido.id }, force: true });
      });
      
       it('tecnico2 should get their assigned ACTIVE pedidos AND all ACTIVE "pendiente_asignacion" pedidos', async () => {
        const response = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${tecnico2Token}`); 
        expect(response.statusCode).toBe(200);
        const pedidos = response.body.data.pedidos;
        const idsEsperados = [
            pedidoCliente2_AsignadoTecnico2_ID_EnProgreso, 
            pedidoCliente1_Pendiente_ID, 
            pedidoCliente2_Pendiente_ID,
            pedidoParaBorrarAdmin_ID
        ].sort((a,b) => a - b);
        const idsRecibidos = pedidos.map(p => p.id).sort((a,b) => a - b);
        expect(idsRecibidos).toEqual(idsEsperados);
        pedidos.forEach(p => expect(p.activo).toBe(true));
      });
    });

    describe('como Administrador (filtrando activos/inactivos)', () => {
      it('should get all ACTIVE pedidos by default (6 pedidos)', async () => {
        const response = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedidos.length).toBe(6);
        response.body.data.pedidos.forEach(p => expect(p.activo).toBe(true));
      });

      it('should get ONLY INACTIVE pedidos if ?activo=false (1 pedido)', async () => {
        const response = await request(app).get('/api/pedidos?activo=false').set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedidos.length).toBe(1);
        response.body.data.pedidos.forEach(p => expect(p.activo).toBe(false));
      });
      
      it('should get ALL pedidos (active and inactive) if ?incluirInactivos=true (7 pedidos)', async () => {
        const response = await request(app).get('/api/pedidos?incluirInactivos=true').set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedidos.length).toBe(7);
        expect(response.body.totalResults).toBe(7);
      });
      
      it('should filter pedidos by estado (e.g., pendiente_asignacion) - defaulting to active', async () => {
        const response = await request(app).get('/api/pedidos?estado=pendiente_asignacion').set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedidos.length).toBe(3); 
        response.body.data.pedidos.forEach(p => {
            expect(p.estado).toBe('pendiente_asignacion');
            expect(p.activo).toBe(true);
        });
      });
       it('should handle pagination correctly when listing all (active and inactive) pedidos', async () => {
        let response = await request(app).get('/api/pedidos?incluirInactivos=true&limit=3&page=1&sort=id').set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedidos.length).toBe(3);
        
        response = await request(app).get('/api/pedidos?incluirInactivos=true&limit=3&page=2&sort=id').set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedidos.length).toBe(3);

        response = await request(app).get('/api/pedidos?incluirInactivos=true&limit=3&page=3&sort=id').set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedidos.length).toBe(1); 
      });
    });
  });

  describe('PATCH /api/pedidos/:id (pedidoController.updatePedido)', () => {
    describe('como Cliente', () => {
      let pedidoClienteParaCancelarID;
      beforeEach(async () => {
        const tempPedidoData = { ...basePedidoData, cliente_id: clienteUser.id, descripcion_problema: 'Pedido Test Cliente PATCH beforeEach', estado: 'pendiente_asignacion', activo: true };
        const tempPedido = await Pedido.create(tempPedidoData);
        pedidoClienteParaCancelarID = tempPedido.id;
        await Pedido.findOrCreate({ where: { id: pedidoCliente1_Completado_ID }, defaults: { ...basePedidoData, cliente_id: clienteUser.id, tecnico_id: tecnicoUser.id, descripcion_problema: 'C1 Completado T1', estado: 'completado', activo: true }});
        await Pedido.findOrCreate({ where: { id: pedidoCliente1_AsignadoTecnico1_ID }, defaults: { ...basePedidoData, cliente_id: clienteUser.id, tecnico_id: tecnicoUser.id, descripcion_problema: 'C1 Asignado T1', estado: 'asignado', activo: true }});
        await Pedido.findOrCreate({ where: { id: pedidoCliente2_AsignadoTecnico2_ID_EnProgreso }, defaults: { ...basePedidoData, cliente_id: cliente2User.id, tecnico_id: tecnico2User.id, descripcion_problema: 'C2 Asignado T2 En Progreso', estado: 'en_progreso', activo: true }});
      });
      afterEach(async () => { if (pedidoClienteParaCancelarID) await Pedido.destroy({ where: { id: pedidoClienteParaCancelarID }, force: true }); });
      it('should allow cliente to cancel their own pedido if "pendiente_asignacion" (200 OK)', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoClienteParaCancelarID}`).set('Authorization', `Bearer ${clienteToken}`).send({ estado: 'cancelado_cliente' }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.estado).toBe('cancelado_cliente'); });
      it('should allow cliente to cancel their own pedido if "asignado" (200 OK)', async () => { await Pedido.update({ estado: 'asignado' }, { where: { id: pedidoClienteParaCancelarID } }); const response = await request(app).patch(`/api/pedidos/${pedidoClienteParaCancelarID}`).set('Authorization', `Bearer ${clienteToken}`).send({ estado: 'cancelado_cliente' }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.estado).toBe('cancelado_cliente'); });
      it('should allow cliente to cancel their own pedido if "tecnico_en_camino" (200 OK)', async () => { await Pedido.update({ estado: 'tecnico_en_camino' }, { where: { id: pedidoClienteParaCancelarID } }); const response = await request(app).patch(`/api/pedidos/${pedidoClienteParaCancelarID}`).set('Authorization', `Bearer ${clienteToken}`).send({ estado: 'cancelado_cliente' }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.estado).toBe('cancelado_cliente'); });
      it('should NOT allow cliente to cancel their own pedido if "en_progreso" (400 Bad Request)', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoCliente2_AsignadoTecnico2_ID_EnProgreso}`).set('Authorization', `Bearer ${cliente2Token}`).send({ estado: 'cancelado_cliente' }); expect(response.statusCode).toBe(400); expect(response.body.message).toMatch(/No puedes cancelar el pedido en su estado actual/i); });
      it('should allow cliente to add/update calificacion and comentario if pedido is "completado" (200 OK)', async () => { const calificacionData = { calificacion_cliente: 5, comentario_cliente: "Excelente servicio, muy rápido!" }; const response = await request(app).patch(`/api/pedidos/${pedidoCliente1_Completado_ID}`).set('Authorization', `Bearer ${clienteToken}`).send(calificacionData); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.calificacion_cliente).toBe(5); expect(response.body.data.pedido.comentario_cliente).toBe(calificacionData.comentario_cliente); });
      it('should allow cliente to edit descripcion and direccion if pedido is "pendiente_asignacion" (200 OK)', async () => { const updateDetails = { descripcion_problema: 'Descripción actualizada por cliente.', direccion_servicio_calle: 'Calle Corregida 123' }; const response = await request(app).patch(`/api/pedidos/${pedidoClienteParaCancelarID}`).set('Authorization', `Bearer ${clienteToken}`).send(updateDetails); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.descripcion_problema).toBe(updateDetails.descripcion_problema); expect(response.body.data.pedido.direccion_servicio_calle).toBe(updateDetails.direccion_servicio_calle); });
      it('should NOT allow cliente to edit descripcion/direccion if pedido is NOT "pendiente_asignacion" (e.g., "asignado")', async () => { await Pedido.update({ estado: 'asignado' }, { where: { id: pedidoClienteParaCancelarID } }); const response = await request(app).patch(`/api/pedidos/${pedidoClienteParaCancelarID}`).set('Authorization', `Bearer ${clienteToken}`).send({ descripcion_problema: 'Intento...' }); expect(response.statusCode).toBe(400);  expect(response.body.message).toMatch(/No se proporcionaron campos válidos para actualizar/i); });
      it('should NOT allow cliente to change tecnico_id or notas_tecnico or other restricted fields', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoClienteParaCancelarID}`).set('Authorization', `Bearer ${clienteToken}`).send({ tecnico_id: tecnicoUser.id, notas_tecnico: "Nota de cliente" }); expect(response.statusCode).toBe(400);  expect(response.body.message).toMatch(/No se proporcionaron campos válidos para actualizar/i); });
      it('should return 403 if cliente tries to update a pedido not belonging to them', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoCliente2_Pendiente_ID}`).set('Authorization', `Bearer ${clienteToken}`).send({ estado: 'cancelado_cliente' }); expect(response.statusCode).toBe(403); expect(response.body.message).toMatch(/No tienes permiso para actualizar este pedido/i); });
      it('should return 401 if not authenticated', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoCliente1_Pendiente_ID}`).send({ estado: 'cancelado_cliente' }); expect(response.statusCode).toBe(401); });
      it('should return 404 if pedido to update does not exist', async () => { const response = await request(app).patch(`/api/pedidos/99999990`).set('Authorization', `Bearer ${clienteToken}`).send({ estado: 'cancelado_cliente' }); expect(response.statusCode).toBe(404); expect(response.body.message).toMatch(/Pedido no encontrado/i); });
    });

    describe('como Tecnico', () => {
      let pedidoTecnicoAsignadoID;
      beforeEach(async () => { const tempPedidoData = { ...basePedidoData, cliente_id: clienteUser.id, tecnico_id: tecnicoUser.id, descripcion_problema: 'Pedido Test Tecnico PATCH beforeEach', estado: 'asignado', activo: true }; const tempPedido = await Pedido.create(tempPedidoData); pedidoTecnicoAsignadoID = tempPedido.id; });
      afterEach(async () => { if(pedidoTecnicoAsignadoID) await Pedido.destroy({where: {id: pedidoTecnicoAsignadoID}, force: true }); });
      it('should allow an assigned tecnico to update estado (e.g., asignado -> tecnico_en_camino)', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoTecnicoAsignadoID}`).set('Authorization', `Bearer ${tecnicoToken}`).send({ estado: 'tecnico_en_camino' }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.estado).toBe('tecnico_en_camino'); });
      it('should allow an assigned tecnico to update estado (e.g., tecnico_en_camino -> en_progreso)', async () => { await Pedido.update({ estado: 'tecnico_en_camino' }, { where: { id: pedidoTecnicoAsignadoID }}); const response = await request(app).patch(`/api/pedidos/${pedidoTecnicoAsignadoID}`).set('Authorization', `Bearer ${tecnicoToken}`).send({ estado: 'en_progreso' }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.estado).toBe('en_progreso'); });
      it('should allow an assigned tecnico to update estado (e.g., en_progreso -> completado)', async () => { await Pedido.update({ estado: 'en_progreso' }, { where: { id: pedidoTecnicoAsignadoID }}); const response = await request(app).patch(`/api/pedidos/${pedidoTecnicoAsignadoID}`).set('Authorization', `Bearer ${tecnicoToken}`).send({ estado: 'completado' }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.estado).toBe('completado'); });
      it('should allow an assigned tecnico to update notas_tecnico', async () => { const notas = "El técnico revisó el equipo y encontró la falla."; const response = await request(app).patch(`/api/pedidos/${pedidoTecnicoAsignadoID}`).set('Authorization', `Bearer ${tecnicoToken}`).send({ notas_tecnico: notas }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.notas_tecnico).toBe(notas); });
      it('should allow an assigned tecnico to update fecha_estimada_resolucion', async () => { const nuevaFecha = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]; const response = await request(app).patch(`/api/pedidos/${pedidoTecnicoAsignadoID}`).set('Authorization', `Bearer ${tecnicoToken}`).send({ fecha_estimada_resolucion: nuevaFecha }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.fecha_estimada_resolucion.startsWith(nuevaFecha)).toBe(true); });
      it('should NOT allow an assigned tecnico to make an invalid estado transition (e.g., asignado -> completado directamente)', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoTecnicoAsignadoID}`).set('Authorization', `Bearer ${tecnicoToken}`).send({ estado: 'completado' }); expect(response.statusCode).toBe(400); expect(response.body.message).toMatch(/Transición de estado de 'asignado' a 'completado' no permitida para el técnico/i); });
      it('should NOT allow an assigned tecnico to update cliente_id or descripcion_problema or other restricted fields', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoTecnicoAsignadoID}`).set('Authorization', `Bearer ${tecnicoToken}`).send({ cliente_id: cliente2User.id, descripcion_problema: "Nueva desc" }); expect(response.statusCode).toBe(400); expect(response.body.message).toMatch(/No se proporcionaron campos válidos para actualizar/i); });
      it('should return 403 if tecnico tries to update a pedido not assigned to them', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoCliente2_AsignadoTecnico2_ID_EnProgreso}`).set('Authorization', `Bearer ${tecnicoToken}`).send({ notas_tecnico: "Intento ajeno" }); expect(response.statusCode).toBe(403); expect(response.body.message).toMatch(/No tienes permiso para actualizar este pedido/i); });
      it('should return 403 if tecnico tries to update a pedido "pendiente_asignacion"', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoCliente1_Pendiente_ID}`).set('Authorization', `Bearer ${tecnicoToken}`).send({ notas_tecnico: "Tomando notas" }); expect(response.statusCode).toBe(403); expect(response.body.message).toMatch(/No tienes permiso para actualizar este pedido/i); });
      it('should 400 if tecnico tries to update an INACTIVE pedido', async () => {
        await Pedido.update({ activo: false }, { where: { id: pedidoTecnicoAsignadoID }});
        const response = await request(app)
          .patch(`/api/pedidos/${pedidoTecnicoAsignadoID}`)
          .set('Authorization', `Bearer ${tecnicoToken}`)
          .send({ notas_tecnico: 'No debería poder' });
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toMatch(/No se puede actualizar un pedido eliminado/i);
        await Pedido.update({ activo: true }, { where: { id: pedidoTecnicoAsignadoID }}); 
      });
      it('should NOT allow an assigned tecnico to change estado from "pendiente_pago" to "completado"', async () => {
        console.log('ID para update (Técnico):', pedidoTecnicoAsignadoID);
        await Pedido.update({ estado: 'pendiente_pago' }, { where: { id: pedidoTecnicoAsignadoID }});
        const response = await request(app)
          .patch(`/api/pedidos/${pedidoTecnicoAsignadoID}`)
          .set('Authorization', `Bearer ${tecnicoToken}`)
          .send({ estado: 'completado' });
        expect(response.statusCode).toBe(400); 
        expect(response.body.message).toMatch(/Transición de estado de 'pendiente_pago' a 'completado' no permitida para el técnico/i);
      });
    });

    describe('como Administrador', () => {
      let pedidoAdminPendienteID, pedidoAdminAsignadoID;
      beforeEach(async () => { const pAdminPend = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, descripcion_problema: 'Admin Test Pendiente', estado: 'pendiente_asignacion', activo: true }); pedidoAdminPendienteID = pAdminPend.id; const pAdminAsig = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, tecnico_id: tecnicoUser.id, descripcion_problema: 'Admin Test Asignado T1', estado: 'asignado', calificacion_cliente: null, comentario_cliente: null, activo: true }); pedidoAdminAsignadoID = pAdminAsig.id; });
      afterEach(async () => { await Pedido.destroy({ where: { id: [pedidoAdminPendienteID, pedidoAdminAsignadoID] }, force: true }); });
      it('should allow admin to assign a tecnico_id to a "pendiente_asignacion" pedido, changing estado to "asignado"', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoAdminPendienteID}`).set('Authorization', `Bearer ${adminToken}`).send({ tecnico_id: tecnicoUser.id }); expect(response.statusCode).toBe(200); const pedidoActualizado = response.body.data.pedido; expect(pedidoActualizado.tecnico_id).toBe(tecnicoUser.id); expect(pedidoActualizado.estado).toBe('asignado'); });
      it('should allow admin to reassign tecnico_id of an "asignado" pedido', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoAdminAsignadoID}`).set('Authorization', `Bearer ${adminToken}`).send({ tecnico_id: tecnico2User.id }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.tecnico_id).toBe(tecnico2User.id); expect(response.body.data.pedido.estado).toBe('asignado'); });
      it('should allow admin to unassign tecnico_id (set to null) from an "asignado" pedido, changing estado to "pendiente_asignacion"', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoAdminAsignadoID}`).set('Authorization', `Bearer ${adminToken}`).send({ tecnico_id: null }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.tecnico_id).toBeNull(); expect(response.body.data.pedido.estado).toBe('pendiente_asignacion'); });
      it('should return 400 if admin tries to assign a non-existent tecnico_id', async () => { const nonExistentTecnicoId = 999999; const response = await request(app).patch(`/api/pedidos/${pedidoAdminPendienteID}`).set('Authorization', `Bearer ${adminToken}`).send({ tecnico_id: nonExistentTecnicoId }); expect(response.statusCode).toBe(400); expect(response.body.message).toMatch(/El técnico con ID \d+ no existe o no es un técnico/i); });
      it('should return 400 if admin tries to assign a tecnico_id of a user who is not a tecnico', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoAdminPendienteID}`).set('Authorization', `Bearer ${adminToken}`).send({ tecnico_id: clienteUser.id });  expect(response.statusCode).toBe(400); expect(response.body.message).toMatch(/El técnico con ID \d+ no existe o no es un técnico/i); });
      it('should allow admin to change estado of a pedido (e.g., pendiente_asignacion -> cancelado_tecnico)', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoAdminPendienteID}`).set('Authorization', `Bearer ${adminToken}`).send({ estado: 'cancelado_tecnico' }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.estado).toBe('cancelado_tecnico'); });
      it('should allow admin to change estado of a pedido (e.g., asignado -> completado)', async () => { const response = await request(app).patch(`/api/pedidos/${pedidoAdminAsignadoID}`).set('Authorization', `Bearer ${adminToken}`).send({ estado: 'completado' }); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.estado).toBe('completado'); });
      it('should allow admin to update most fields (e.g., descripcion_problema, notas_tecnico, direccion)', async () => { const updates = { descripcion_problema: "Admin desc. actualizada", notas_tecnico: "Admin notes. actualizadas.", direccion_servicio_ciudad: "Ciudad Admin Actualizada" }; const response = await request(app).patch(`/api/pedidos/${pedidoAdminAsignadoID}`).set('Authorization', `Bearer ${adminToken}`).send(updates); expect(response.statusCode).toBe(200); expect(response.body.data.pedido.descripcion_problema).toBe(updates.descripcion_problema); expect(response.body.data.pedido.notas_tecnico).toBe(updates.notas_tecnico); expect(response.body.data.pedido.direccion_servicio_ciudad).toBe(updates.direccion_servicio_ciudad); });
      it('should NOT allow admin to update calificacion_cliente or comentario_cliente', async () => { const originalPedido = await Pedido.findByPk(pedidoAdminAsignadoID); const response = await request(app).patch(`/api/pedidos/${pedidoAdminAsignadoID}`).set('Authorization', `Bearer ${adminToken}`).send({ calificacion_cliente: 1, comentario_cliente: "Admin no deberia" }); expect(response.statusCode).toBe(400);  expect(response.body.message).toMatch(/No se proporcionaron campos válidos para actualizar/i); const pedidoEnDB = await Pedido.findByPk(pedidoAdminAsignadoID); expect(pedidoEnDB.calificacion_cliente).toBe(originalPedido.calificacion_cliente); expect(pedidoEnDB.comentario_cliente).toBe(originalPedido.comentario_cliente); });
      it('should allow admin to reactivate an INACTIVE pedido by setting activo:true', async () => {
        await Pedido.update({ activo: false }, { where: { id: pedidoAdminAsignadoID }});
        const response = await request(app)
          .patch(`/api/pedidos/${pedidoAdminAsignadoID}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ activo: true, notas_tecnico: 'Reactivado por admin' });
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedido.activo).toBe(true);
        expect(response.body.data.pedido.notas_tecnico).toBe('Reactivado por admin');
      });
      it('should allow admin to change estado from "pendiente_pago" to "completado"', async () => {
        console.log('ID para update (Admin - pendiente_pago):', pedidoAdminAsignadoID); 
        await Pedido.update({ estado: 'pendiente_pago' }, { where: { id: pedidoAdminAsignadoID }});
        const response = await request(app)
          .patch(`/api/pedidos/${pedidoAdminAsignadoID}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ estado: 'completado' });
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedido.estado).toBe('completado');
      });
      it('should allow admin to change estado from "completado" back to "pendiente_asignacion" (testing flexibility)', async () => {
        console.log('ID para update (Admin - completado):', pedidoAdminAsignadoID); 
        await Pedido.update({ estado: 'completado' }, { where: { id: pedidoAdminAsignadoID }});
        const response = await request(app)
          .patch(`/api/pedidos/${pedidoAdminAsignadoID}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ estado: 'pendiente_asignacion' });
        expect(response.statusCode).toBe(200);
        expect(response.body.data.pedido.estado).toBe('pendiente_asignacion');
      });
    });
  });

  describe('DELETE /api/pedidos/:id (Borrado Lógico)', () => {
    let pedidoActivoParaBorrarID;
    beforeEach(async () => {
      const pedido = await Pedido.create({ ...basePedidoData, cliente_id: clienteUser.id, descripcion_problema: 'Pedido específico para borrado', estado: 'pendiente_asignacion', activo: true });
      pedidoActivoParaBorrarID = pedido.id;
    });
    afterEach(async () => { if (pedidoActivoParaBorrarID) await Pedido.destroy({ where: { id: pedidoActivoParaBorrarID }, force: true }); });

    it('should allow an admin to logically delete a pedido (set activo: false) - 204 No Content', async () => {
      const response = await request(app).delete(`/api/pedidos/${pedidoActivoParaBorrarID}`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(204);
      const pedidoEnDB = await Pedido.findByPk(pedidoActivoParaBorrarID);
      expect(pedidoEnDB).not.toBeNull();
      expect(pedidoEnDB.activo).toBe(false);
    });

    it('should return 400 if admin tries to delete an already inactive pedido', async () => {
      await Pedido.update({ activo: false }, { where: { id: pedidoActivoParaBorrarID } });
      const response = await request(app).delete(`/api/pedidos/${pedidoActivoParaBorrarID}`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/Este pedido ya ha sido eliminado/i);
    });

    it('should return 404 if trying to delete a non-existent pedido', async () => {
      const response = await request(app).delete(`/api/pedidos/999999`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if a cliente tries to delete a pedido', async () => {
      const response = await request(app).delete(`/api/pedidos/${pedidoActivoParaBorrarID}`).set('Authorization', `Bearer ${clienteToken}`);
      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if a tecnico tries to delete a pedido', async () => {
      const response = await request(app).delete(`/api/pedidos/${pedidoActivoParaBorrarID}`).set('Authorization', `Bearer ${tecnicoToken}`);
      expect(response.statusCode).toBe(403);
    });

    it('should return 401 if not authenticated when trying to delete', async () => {
        const response = await request(app).delete(`/api/pedidos/${pedidoActivoParaBorrarID}`);
        expect(response.statusCode).toBe(401);
    });
  });
});