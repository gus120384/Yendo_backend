// tests/user.admin.test.js
const request = require('supertest');
const app = require('../app');
const { User, sequelize } = require('../models'); // MODIFICADO: Descomentado y añadido sequelize

// Helper para crear un usuario y obtener su token (reutilizado)
const createUserAndLogin = async (userData) => {
  await User.destroy({ where: { email: userData.email }, force: true });
  await User.create(userData);
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: userData.password });
  if (loginResponse.body && loginResponse.body.token) {
    return loginResponse.body.token;
  }
  console.error('Fallo al crear/loguear usuario para prueba:', userData.email, loginResponse.body);
  throw new Error(`No se pudo obtener token para ${userData.email}`);
};

describe('Admin User Management Routes - /api/users/admin', () => {
  let adminPrimeToken;
  let adminNormalToken;
  let clienteToken;
  let adminPrimeUserInstance; 

  const adminPrimeData = { nombre: 'Prime', apellido: 'AdminUser', email: 'prime@example.com', password: 'Password123!', rol: 'admin_prime' };
  const adminNormalData = { nombre: 'Normal', apellido: 'AdminUser', email: 'admin@example.com', password: 'Password123!', rol: 'administrador' };
  const clienteData = { nombre: 'Cliente', apellido: 'Prueba', email: 'cliente.admin-test@example.com', password: 'Password123!', rol: 'cliente' };
  
  let targetUserCliente;
  let targetUserTecnico;
  let targetUserAdmin;

  const newUserDataBase = {
    nombre: 'NewUser',
    apellido: 'ByAdmin',
    password: 'PasswordNew123!',
    telefono: '6677889900',
    direccion_calle: 'Av. Siempreviva',
    direccion_numero: '742',
    direccion_ciudad: 'Springfield',
    direccion_provincia: 'State',
    direccion_cp: '12345'
  };

  beforeAll(async () => {
    await User.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });

    adminPrimeToken = await createUserAndLogin(adminPrimeData);
    adminNormalToken = await createUserAndLogin(adminNormalData);
    clienteToken = await createUserAndLogin(clienteData);

    adminPrimeUserInstance = await User.findOne({ where: { email: adminPrimeData.email } });
    if (!adminPrimeUserInstance) {
      throw new Error('No se pudo obtener la instancia del usuario admin_prime principal.');
    }

    targetUserCliente = await User.create({ nombre: 'Target', apellido: 'Cliente', email: 'target.cliente@example.com', password: 'Password123!', rol: 'cliente' });
    targetUserTecnico = await User.create({ nombre: 'Target', apellido: 'Tecnico', email: 'target.tecnico@example.com', password: 'Password123!', rol: 'tecnico' });
    targetUserAdmin = await User.create({ nombre: 'Target', apellido: 'Admin', email: 'target.admin@example.com', password: 'Password123!', rol: 'administrador' });

    if (!adminPrimeToken || !adminNormalToken || !clienteToken) {
      throw new Error('Fallo al obtener tokens necesarios para las pruebas de admin.');
    }
  });

  describe('GET /api/users/admin', () => {
    it('should return 401 if no token is provided', async () => {
        const response = await request(app).get('/api/users/admin');
        expect(response.statusCode).toBe(401);
      });
  
      it('should return 403 if user is not an admin (e.g., cliente)', async () => {
        const response = await request(app)
          .get('/api/users/admin')
          .set('Authorization', `Bearer ${clienteToken}`);
        expect(response.statusCode).toBe(403); 
        expect(response.body.message).toMatch(/No tienes permiso para realizar esta acción/i);
      });
  
      it('should allow admin_prime to get all users', async () => {
        const response = await request(app)
          .get('/api/users/admin')
          .set('Authorization', `Bearer ${adminPrimeToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.users).toBeInstanceOf(Array);
        expect(response.body.data.users.length).toBeGreaterThanOrEqual(6); 
        response.body.data.users.forEach(user => {
            expect(user).not.toHaveProperty('password');
        });
      });
  
      it('should allow admin_normal to get all users', async () => {
        const response = await request(app)
          .get('/api/users/admin')
          .set('Authorization', `Bearer ${adminNormalToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.users).toBeInstanceOf(Array);
      });
  
      it('should filter users by rol if "rol" query param is provided (admin_prime)', async () => {
          const response = await request(app)
            .get('/api/users/admin?rol=cliente')
            .set('Authorization', `Bearer ${adminPrimeToken}`);
          expect(response.statusCode).toBe(200);
          expect(response.body.data.users.length).toBeGreaterThanOrEqual(2); 
          response.body.data.users.forEach(user => {
            expect(user.rol).toBe('cliente');
          });
      });
  
      it('should filter users by activo status (e.g., activo=true)', async () => {
          await User.update({ activo: false }, { where: { email: targetUserTecnico.email }});
          const response = await request(app)
            .get('/api/users/admin?activo=true')
            .set('Authorization', `Bearer ${adminPrimeToken}`);
          expect(response.statusCode).toBe(200);
          let foundInactiveInResults = false;
          response.body.data.users.forEach(user => {
            expect(user.activo).toBe(true);
            if(user.email === targetUserTecnico.email) foundInactiveInResults = true;
          });
          expect(foundInactiveInResults).toBe(false);
          await User.update({ activo: true }, { where: { email: targetUserTecnico.email }});
      });
      
      it('should filter users by searchTerm (e.g., email)', async () => {
          const response = await request(app)
            .get(`/api/users/admin?searchTerm=${targetUserCliente.email}`)
            .set('Authorization', `Bearer ${adminPrimeToken}`);
          expect(response.statusCode).toBe(200);
          expect(response.body.data.users.length).toBe(1);
          expect(response.body.data.users[0].email).toBe(targetUserCliente.email);
      });
  
      it('should handle pagination correctly (page and limit)', async () => {
          const tempUsersData = [];
          for(let i = 0; i < 3; i++) { 
              tempUsersData.push({ nombre: `PageUser${i+1}`, apellido: 'TestPag', email: `page${i+1}@example.com`, password: 'Password123!', rol: 'cliente' });
          }
          await User.bulkCreate(tempUsersData);
          
          const responsePage1 = await request(app)
              .get('/api/users/admin?limit=2&page=1&rol=cliente') 
              .set('Authorization', `Bearer ${adminPrimeToken}`);
          expect(responsePage1.statusCode).toBe(200);
          expect(responsePage1.body.data.users.length).toBeLessThanOrEqual(2);
          expect(responsePage1.body.currentPage).toBe(1);
  
          const responsePage2 = await request(app)
              .get('/api/users/admin?limit=2&page=2&rol=cliente')
              .set('Authorization', `Bearer ${adminPrimeToken}`);
          expect(responsePage2.statusCode).toBe(200);
          expect(responsePage2.body.data.users.length).toBeGreaterThanOrEqual(0); 
          expect(responsePage2.body.currentPage).toBe(2);
  
          if (responsePage1.body.data.users.length > 0 && responsePage2.body.data.users.length > 0) {
              const idsPage1 = responsePage1.body.data.users.map(u => u.id);
              const idsPage2 = responsePage2.body.data.users.map(u => u.id);
              idsPage2.forEach(id => {
                  expect(idsPage1).not.toContain(id);
              });
          }
          for (const user of tempUsersData) {
              await User.destroy({ where: { email: user.email }, force: true });
          }
      });
  });

  describe('GET /api/users/admin/:id', () => {
    it('should return 403 if user is not an admin', async () => {
        const response = await request(app)
          .get(`/api/users/admin/${targetUserCliente.id}`)
          .set('Authorization', `Bearer ${clienteToken}`);
        expect(response.statusCode).toBe(403);
      });
  
      it('should allow admin_prime to get a specific user by ID', async () => {
        const response = await request(app)
          .get(`/api/users/admin/${targetUserCliente.id}`)
          .set('Authorization', `Bearer ${adminPrimeToken}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.user.id).toBe(targetUserCliente.id);
        expect(response.body.data.user).not.toHaveProperty('password');
      });
  
      it('should return 404 if user ID does not exist', async () => {
        const nonExistentId = 999999;
        const response = await request(app)
          .get(`/api/users/admin/${nonExistentId}`)
          .set('Authorization', `Bearer ${adminPrimeToken}`);
        expect(response.statusCode).toBe(404);
        expect(response.body.message).toMatch(/Usuario no encontrado con el ID proporcionado/i);
      });
      
      it('should return 400 if user ID is not valid (e.g., not an integer)', async () => {
        const invalidId = 'abc';
        const response = await request(app)
          .get(`/api/users/admin/${invalidId}`)
          .set('Authorization', `Bearer ${adminPrimeToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body.message).toMatch(/El ID de usuario proporcionado no es válido/i);
      });
  });

  describe('POST /api/users/admin/create-user', () => {
    const emailsToCleanInPost = [ 
      'post.401@example.com', 'post.403.cliente@example.com',
      'new.cliente.prime@example.com', 'new.tecnico.prime@example.com', 'new.admin.prime@example.com',
      'new.cliente.normal@example.com', 'new.tecnico.normal@example.com', 'another.admin@example.com',
      'another.prime@example.com', 'invalid.rol@example.com', 'short.pass@example.com',
      'existing.user.test@example.com', 'new.tecnico.supervised@example.com',
      'cliente.with.adminid@example.com', 'tecnico.bad.adminid@example.com',
      'tecnico.nonadmin.supervisor@example.com'
    ];

    beforeEach(async () => {
      for (const email of emailsToCleanInPost) {
        await User.destroy({ where: { email }, force: true });
      }
    });

    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .send({ ...newUserDataBase, rol: 'cliente', email: 'post.401@example.com' });
      expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (e.g., cliente)', async () => {
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ ...newUserDataBase, rol: 'cliente', email: 'post.403.cliente@example.com' });
      expect(response.statusCode).toBe(403);
      expect(response.body.message).toMatch(/No tienes permiso para realizar esta acción/i);
    });

    it('should allow admin_prime to create a new cliente user', async () => {
      const userDataToCreate = { ...newUserDataBase, rol: 'cliente', email: 'new.cliente.prime@example.com' };
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminPrimeToken}`)
        .send(userDataToCreate);

      expect(response.statusCode).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Usuario creado exitosamente por el administrador.');
      expect(response.body.data.user.email).toBe(userDataToCreate.email.toLowerCase());
      expect(response.body.data.user.rol).toBe('cliente');
      expect(response.body.data.user).not.toHaveProperty('password');

      const dbUser = await User.findOne({ where: { email: userDataToCreate.email } });
      expect(dbUser).not.toBeNull();
      expect(dbUser.nombre).toBe(userDataToCreate.nombre);
      expect(dbUser.rol).toBe('cliente');
      const passwordMatch = await dbUser.validarPassword(userDataToCreate.password);
      expect(passwordMatch).toBe(true);
    });

    it('should allow admin_prime to create a new tecnico user', async () => {
        const userDataToCreate = { ...newUserDataBase, rol: 'tecnico', email: 'new.tecnico.prime@example.com' };
        const response = await request(app)
          .post('/api/users/admin/create-user')
          .set('Authorization', `Bearer ${adminPrimeToken}`)
          .send(userDataToCreate);
        expect(response.statusCode).toBe(201);
        expect(response.body.data.user.rol).toBe('tecnico');
    });

    it('should allow admin_prime to create a new administrador user', async () => {
      const userDataToCreate = { ...newUserDataBase, rol: 'administrador', email: 'new.admin.prime@example.com' };
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminPrimeToken}`)
        .send(userDataToCreate);
      expect(response.statusCode).toBe(201);
      expect(response.body.data.user.rol).toBe('administrador');
    });
    
    it('should allow admin_normal to create a new cliente user', async () => {
      const userDataToCreate = { ...newUserDataBase, rol: 'cliente', email: 'new.cliente.normal@example.com' };
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminNormalToken}`)
        .send(userDataToCreate);
      expect(response.statusCode).toBe(201);
      expect(response.body.data.user.rol).toBe('cliente');
    });

    it('should allow admin_normal to create a new tecnico user', async () => {
      const userDataToCreate = { ...newUserDataBase, rol: 'tecnico', email: 'new.tecnico.normal@example.com' };
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminNormalToken}`)
        .send(userDataToCreate);
      expect(response.statusCode).toBe(201);
      expect(response.body.data.user.rol).toBe('tecnico');
    });

    it('should NOT allow admin_normal to create an administrador user', async () => {
      const userDataToCreate = { ...newUserDataBase, rol: 'administrador', email: 'another.admin@example.com' };
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminNormalToken}`)
        .send(userDataToCreate);
      expect(response.statusCode).toBe(403);
      expect(response.body.message).toMatch(/Un administrador no puede crear usuarios con rol de administrador o superior/i);
    });

    it('should NOT allow admin_normal to create an admin_prime user', async () => {
      const userDataToCreate = { ...newUserDataBase, rol: 'admin_prime', email: 'another.prime@example.com' };
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminNormalToken}`)
        .send(userDataToCreate);
      expect(response.statusCode).toBe(403);
      expect(response.body.message).toMatch(/Un administrador no puede crear usuarios con rol de administrador o superior/i);
    });

    it('should return 400 if required fields are missing (e.g., email, password, rol)', async () => {
      const incompleteData = { 
          nombre: newUserDataBase.nombre, 
          apellido: newUserDataBase.apellido 
        };
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminPrimeToken}`)
        .send(incompleteData);
      expect(response.statusCode).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('Nombre, apellido, email, contraseña y rol son requeridos.');
    });

    it('should return 400 for invalid rol', async () => {
      const userDataWithInvalidRol = { ...newUserDataBase, rol: 'invalid_rol_value', email: 'invalid.rol@example.com' };
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminPrimeToken}`)
        .send(userDataWithInvalidRol);
      expect(response.statusCode).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toMatch(/Rol inválido\. Los roles permitidos son: cliente, tecnico, administrador, admin_prime\./i);
    });

    it('should return 400 if password is too short', async () => {
      const userDataWithShortPassword = { 
        nombre: newUserDataBase.nombre,
        apellido: newUserDataBase.apellido,
        email: 'short.pass@example.com',
        password: 'short', 
        rol: 'cliente' 
      };
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminPrimeToken}`)
        .send(userDataWithShortPassword);
      expect(response.statusCode).toBe(400);
      expect(response.body.status).toBe('fail');
      expect(response.body.message).toBe('La contraseña debe tener al menos 8 caracteres.');
    });

    it('should return 400 if email already exists (SequelizeUniqueConstraintError)', async () => {
      const existingUserData = { ...newUserDataBase, rol: 'cliente', email: 'existing.user.test@example.com' };
      await User.create(existingUserData); 
      const response = await request(app)
        .post('/api/users/admin/create-user')
        .set('Authorization', `Bearer ${adminPrimeToken}`)
        .send(existingUserData); 
      expect(response.statusCode).toBe(400);
      expect(response.body.status).toBe('fail'); 
      expect(response.body.message).toMatch(/El valor 'existing.user.test@example.com' para el campo 'email' ya existe\. Por favor, elige otro\./i);
    });

    it('should correctly assign administrador_id to a tecnico if provided by admin_prime', async () => {
        const adminNormalWhoWillSupervise = await User.findOne({ where: { email: adminNormalData.email } });
        expect(adminNormalWhoWillSupervise).not.toBeNull();
        const tecnicoData = { 
            ...newUserDataBase, 
            rol: 'tecnico', 
            email: 'new.tecnico.supervised@example.com',
            administrador_id: adminNormalWhoWillSupervise.id 
        };
        const response = await request(app)
            .post('/api/users/admin/create-user')
            .set('Authorization', `Bearer ${adminPrimeToken}`)
            .send(tecnicoData);
        expect(response.statusCode).toBe(201);
        expect(response.body.data.user.administrador_id).toBe(adminNormalWhoWillSupervise.id);
        const dbTecnico = await User.findOne({ where: { email: tecnicoData.email } });
        expect(dbTecnico.administrador_id).toBe(adminNormalWhoWillSupervise.id);
    });

    it('should return 400 if administrador_id is provided for a non-tecnico rol', async () => {
        const adminNormalWhoWillSupervise = await User.findOne({ where: { email: adminNormalData.email } }); 
        expect(adminNormalWhoWillSupervise).not.toBeNull();
        const clienteDataWithAdminId = { 
            ...newUserDataBase, 
            rol: 'cliente', 
            email: 'cliente.with.adminid@example.com',
            administrador_id: adminNormalWhoWillSupervise.id 
        };
        const response = await request(app)
            .post('/api/users/admin/create-user')
            .set('Authorization', `Bearer ${adminPrimeToken}`)
            .send(clienteDataWithAdminId);
        expect(response.statusCode).toBe(400); 
        expect(response.body.status).toBe('fail');
        expect(response.body.message).toBe('Solo se puede asignar un administrador_id a usuarios con rol "tecnico".');
    });

    it('should return 400 if provided administrador_id does not exist', async () => {
        const tecnicoData = { 
            ...newUserDataBase, 
            rol: 'tecnico', 
            email: 'tecnico.bad.adminid@example.com',
            administrador_id: 999999 
        };
        const response = await request(app)
            .post('/api/users/admin/create-user')
            .set('Authorization', `Bearer ${adminPrimeToken}`)
            .send(tecnicoData);
        expect(response.statusCode).toBe(400);
        expect(response.body.status).toBe('fail');
        expect(response.body.message).toMatch(/El administrador_id 999999 no corresponde a un usuario existente/i);
    });

    it('should return 400 if provided administrador_id is not an admin/admin_prime', async () => {
        const clienteAsSupervisor = await User.findOne({ where: { email: clienteData.email } }); 
        expect(clienteAsSupervisor).not.toBeNull();
        const tecnicoData = { 
            ...newUserDataBase, 
            rol: 'tecnico', 
            email: 'tecnico.nonadmin.supervisor@example.com',
            administrador_id: clienteAsSupervisor.id 
        };
        const response = await request(app)
            .post('/api/users/admin/create-user')
            .set('Authorization', `Bearer ${adminPrimeToken}`)
            .send(tecnicoData);
        expect(response.statusCode).toBe(400);
        expect(response.body.status).toBe('fail');
        expect(response.body.message).toMatch(/El usuario con ID .* no tiene un rol de administrador válido para supervisar/i);
    });
  });

  describe('PATCH /api/users/admin/:id', () => {
    let userToUpdateByPrime;
    let tecnicoToUpdateByPrime;
    let adminTargetForPrime;
    let primeTargetForPrime; 

    let userToUpdateByNormalAdmin;
    let tecnicoToUpdateByNormalAdmin;

    const emailsToCleanInPatch = [ 
        'client.update.prime@example.com',
        'tecnico.update.prime@example.com',
        'admin.target.prime@example.com',
        'client.update.normal@example.com',
        'tecnico.update.normal@example.com'
    ];

    beforeEach(async () => {
      for (const email of emailsToCleanInPatch) {
          await User.destroy({ where: { email: email }, force: true });
      }

      userToUpdateByPrime = await User.create({ nombre: 'ClientToUpdateP', apellido: 'Test', email: 'client.update.prime@example.com', password: 'Password123!', rol: 'cliente' });
      tecnicoToUpdateByPrime = await User.create({ nombre: 'TecnicoToUpdateP', apellido: 'Test', email: 'tecnico.update.prime@example.com', password: 'Password123!', rol: 'tecnico' });
      adminTargetForPrime = await User.create({ nombre: 'AdminTargetP', apellido: 'Test', email: 'admin.target.prime@example.com', password: 'Password123!', rol: 'administrador' });
      
      primeTargetForPrime = adminPrimeUserInstance;
      if (!primeTargetForPrime) {
        throw new Error('Admin Prime principal no encontrado en beforeEach de PATCH. Verifica adminPrimeUserInstance.');
      }

      userToUpdateByNormalAdmin = await User.create({ nombre: 'ClientToUpdateN', apellido: 'Test', email: 'client.update.normal@example.com', password: 'Password123!', rol: 'cliente' });
      tecnicoToUpdateByNormalAdmin = await User.create({ nombre: 'TecnicoToUpdateN', apellido: 'Test', email: 'tecnico.update.normal@example.com', password: 'Password123!', rol: 'tecnico' });
    });

    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .patch(`/api/users/admin/${userToUpdateByPrime.id}`)
        .send({ nombre: 'Updated Name' });
      expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (e.g., cliente)', async () => {
      const response = await request(app)
        .patch(`/api/users/admin/${userToUpdateByPrime.id}`)
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ nombre: 'Updated Name' });
      expect(response.statusCode).toBe(403);
      expect(response.body.message).toMatch(/No tienes permiso para realizar esta acción/i);
    });

    it('should allow admin_prime to assign an administrador_id to a tecnico', async () => {
        const adminToSupervise = await User.findOne({where: {email: adminNormalData.email}}); 
        expect(adminToSupervise).not.toBeNull();
        
        const updates = { administrador_id: adminToSupervise.id };
        const response = await request(app)
          .patch(`/api/users/admin/${tecnicoToUpdateByPrime.id}`) 
          .set('Authorization', `Bearer ${adminPrimeToken}`)
          .send(updates);
  
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.user.administrador_id).toBe(adminToSupervise.id);
        
        const dbUser = await User.findByPk(tecnicoToUpdateByPrime.id);
        expect(dbUser.administrador_id).toBe(adminToSupervise.id);
    });
    
    it('should NOT allow admin_normal to update an "admin_prime" user', async () => {
      const updates = { nombre: 'IntentoDeCambioAdminPrime' };
      const response = await request(app)
        .patch(`/api/users/admin/${primeTargetForPrime.id}`)
        .set('Authorization', `Bearer ${adminNormalToken}`)
        .send(updates);

      expect(response.statusCode).toBe(403);
      // MODIFICADO para coincidir con el mensaje general de la API
      expect(response.body.message).toMatch(/Un administrador no puede modificar usuarios con rol administrador o admin_prime/i);
    });

    it('should allow admin_prime to update a cliente user', async () => {
        const updates = { nombre: 'Cliente Actualizado', telefono: '111222333' };
        const response = await request(app)
            .patch(`/api/users/admin/${userToUpdateByPrime.id}`)
            .set('Authorization', `Bearer ${adminPrimeToken}`)
            .send(updates);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.user.nombre).toBe(updates.nombre);
        expect(response.body.data.user.telefono).toBe(updates.telefono);
    });

    it('should NOT allow admin_normal to update another "administrador" user', async () => {
        const updates = { nombre: 'IntentoDeCambioAdminPorOtroAdmin' };
        const response = await request(app)
          .patch(`/api/users/admin/${adminTargetForPrime.id}`) 
          .set('Authorization', `Bearer ${adminNormalToken}`)
          .send(updates);
  
        expect(response.statusCode).toBe(403);
        expect(response.body.message).toMatch(/Un administrador no puede modificar usuarios con rol administrador o admin_prime/i); 
      });

    it('should return 404 if trying to update a non-existent user ID', async () => {
        const nonExistentId = 999888;
        const response = await request(app)
            .patch(`/api/users/admin/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminPrimeToken}`)
            .send({ nombre: 'NoExisto' });
        expect(response.statusCode).toBe(404);
        expect(response.body.message).toMatch(/Usuario no encontrado con el ID proporcionado/i);
    });
    
    it('should allow admin_prime to change rol from cliente to tecnico', async () => {
        const updates = { rol: 'tecnico' };
        const response = await request(app)
            .patch(`/api/users/admin/${userToUpdateByPrime.id}`)
            .set('Authorization', `Bearer ${adminPrimeToken}`)
            .send(updates);
        expect(response.statusCode).toBe(200);
        expect(response.body.data.user.rol).toBe('tecnico');
    });

    it('should NOT allow admin_normal to change rol to "administrador"', async () => {
        const updates = { rol: 'administrador' };
        const response = await request(app)
            .patch(`/api/users/admin/${userToUpdateByNormalAdmin.id}`) 
            .set('Authorization', `Bearer ${adminNormalToken}`)
            .send(updates);
        expect(response.statusCode).toBe(403);
        expect(response.body.message).toMatch(/Un administrador no puede promover otros usuarios a roles de administración superior/i); 
    });

  }); 

}); 

afterAll(async () => {
  await sequelize.close();
});