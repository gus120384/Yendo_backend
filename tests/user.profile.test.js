// tests/user.profile.test.js
const request = require('supertest');
const app = require('../app');
const { User, sequelize } = require('../models'); // <--- CORREGIDO

const createUserAndLogin = async (userData) => {
  await User.destroy({ where: { email: userData.email }, force: true }); // force: true para asegurar limpieza
  await User.create(userData);
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: userData.password });
  return loginResponse.body.token;
};

describe('User Profile Routes - /api/users/me', () => {
  let testUserToken;
  const baseTestUserData = {
    nombre: 'ProfileUser',
    apellido: 'Tester',
    email: 'profile.tester@example.com',
    password: 'PasswordProfile123!',
    telefono: '1122334455',
    rol: 'cliente',
    direccion_calle: 'Calle Vieja',
    direccion_numero: '000',
    direccion_ciudad: 'Ciudad Antigua',
    direccion_provincia: 'Provincia Original',
    direccion_cp: 'OLDCP'
  };

  beforeAll(async () => {
    // Limpieza general una vez antes de todos los tests en esta suite
    await User.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
    testUserToken = await createUserAndLogin(baseTestUserData);
    if (!testUserToken) {
      throw new Error('No se pudo obtener el token para el usuario de prueba en beforeAll.');
    }
  });

  afterAll(async () => { // <--- CORREGIDO: Descomentado
    await sequelize.close();
  });

  describe('GET /me (userController.getMe)', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(app).get('/api/users/me');
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('No estás autenticado. Por favor, inicia sesión para obtener acceso.');
    });

    it('should return 401 if token is invalid (malformed)', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Token inválido. Por favor, inicia sesión de nuevo.');
    });

    it('should return the profile of the authenticated user', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
      const userInResponse = response.body.data.user;
      expect(userInResponse).toBeDefined();
      expect(userInResponse.id).toBeDefined();
      expect(userInResponse.email).toBe(baseTestUserData.email.toLowerCase());
      expect(userInResponse.nombre).toBe(baseTestUserData.nombre);
      expect(userInResponse.apellido).toBe(baseTestUserData.apellido);
      expect(userInResponse.rol).toBe(baseTestUserData.rol);
      expect(userInResponse.telefono).toBe(baseTestUserData.telefono);
      expect(userInResponse.direccion_calle).toBe(baseTestUserData.direccion_calle);
      expect(userInResponse).not.toHaveProperty('password');
    });
  });

  describe('PATCH /me (userController.updateMe)', () => {
    // Recrear el usuario base antes de cada test de PATCH para asegurar un estado limpio,
    // ya que un test podría modificarlo. O, si prefieres, el beforeAll es suficiente
    // si los tests de PATCH no interfieren destructivamente con el estado del usuario base
    // para los tests GET. Para /me, usualmente no es un problema mayor si el token sigue siendo válido.
    // Si haces cambios que invalidan el token (como cambiar password aquí, aunque /me no lo hace),
    // necesitarías un beforeEach para recrear y reloguear. Por ahora, el beforeAll es suficiente.

    const updatePayload = {
      nombre: 'UpdatedProfileName',
      apellido: 'UpdatedLastName',
      telefono: '5544332211',
      direccion_calle: 'Nueva Calle',
      direccion_numero: '123A',
      direccion_ciudad: 'Ciudad Actualizada',
      direccion_provincia: 'Nueva Provincia',
      direccion_cp: 'NEWCP',
      email: 'new.email.profile@example.com',
      rol: 'administrador',
      password: 'NewPassword123!',
      activo: false
    };

    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .send(updatePayload);
      expect(response.statusCode).toBe(401);
    });

    it('should update allowed fields for the authenticated user and ignore disallowed fields', async () => {
      // Crear una copia del usuario base para modificar en este test sin afectar a otros
      // que podrían depender del estado original del beforeAll.
      // Sin embargo, como estamos actualizando el usuario referenciado por testUserToken,
      // este cambio persistirá para tests subsecuentes si no hay un beforeEach para resetear.
      // Por ahora, asumimos que está bien para esta suite.
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updatePayload);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Perfil actualizado exitosamente.');
      
      const userInResponse = response.body.data.user;
      expect(userInResponse.nombre).toBe(updatePayload.nombre);
      expect(userInResponse.apellido).toBe(updatePayload.apellido);
      expect(userInResponse.telefono).toBe(updatePayload.telefono);
      expect(userInResponse.direccion_calle).toBe(updatePayload.direccion_calle);
      expect(userInResponse.direccion_numero).toBe(updatePayload.direccion_numero);
      
      expect(userInResponse.email).toBe(baseTestUserData.email.toLowerCase());
      expect(userInResponse.rol).toBe(baseTestUserData.rol);
      expect(userInResponse.activo).toBe(true); 

      const dbUser = await User.findOne({ where: { email: baseTestUserData.email } });
      expect(dbUser.nombre).toBe(updatePayload.nombre);
      expect(dbUser.apellido).toBe(updatePayload.apellido);
      expect(dbUser.email).toBe(baseTestUserData.email.toLowerCase());
      // Es importante re-validar la contraseña original ya que no debería cambiar.
      // Busca el usuario original por ID o email para obtener su password hasheado actual.
      const originalUserFromDB = await User.unscoped().findOne({ where: { email: baseTestUserData.email } });
      const passwordMatch = await originalUserFromDB.validarPassword(baseTestUserData.password);
      expect(passwordMatch).toBe(true);
    });
    
    it('should return 400 if request body is empty', async () => {
        const response = await request(app)
          .patch('/api/users/me')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({}); 
        expect(response.statusCode).toBe(400);
        expect(response.body.status).toBe('fail');
        expect(response.body.message).toBe('No se proporcionaron datos para actualizar o el cuerpo de la solicitud está vacío/inválido.');
    });

    it('should return 400 if only disallowed fields or no valid updatable data is sent', async () => {
        const response = await request(app)
          .patch('/api/users/me')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ email: 'new@test.com', rol: 'administrador', password: 'newPassword' }); 
        expect(response.statusCode).toBe(400);
        expect(response.body.status).toBe('fail');
        expect(response.body.message).toBe('Ninguno de los campos proporcionados es permitido para la actualización o no se enviaron datos válidos.');
    });

    it('should return 400 on model validation error (e.g., empty nombre)', async () => {
        // Para este test, es mejor si el usuario se "resetea" a su estado original antes de este test
        // si el test anterior ('should update allowed fields...') modificó su nombre.
        // Podríamos usar un beforeEach dentro de este describe('PATCH /me') o
        // crear un usuario específico para este test.
        // Por simplicidad ahora, asumimos que el token sigue siendo del usuario con nombre 'ProfileUser'.
        // Si el test anterior cambió el nombre a 'UpdatedProfileName', este test fallará
        // si la BD no se resetea entre los 'it' de este describe anidado.
        // Lo ideal sería un beforeEach que cree 'baseTestUserData' antes de cada 'it' en este describe.

        // Solución temporal si el test anterior modifica el usuario:
        // Re-crear el usuario base (o uno específico para este test) y obtener un nuevo token.
        // Sin embargo, para no complicar, mantendremos el token del beforeAll por ahora.
        // El `beforeAll` limpia la tabla completa, y `createUserAndLogin` también limpia por email.
        // Pero el `testUserToken` es del usuario creado en `beforeAll`.
        // Si el test 'should update allowed fields' lo modifica, el estado cambia.

        // Para hacer este test más robusto, se podría hacer esto (pero requiere un nuevo login):
        // await User.update({ nombre: baseTestUserData.nombre }, { where: { email: baseTestUserData.email } });

        const response = await request(app)
          .patch('/api/users/me')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ nombre: "" }); // Intentar poner el nombre vacío
        expect(response.statusCode).toBe(400);
        expect(response.body.status).toBe('fail');
        expect(response.body.message).toMatch(/Error de validación: El nombre no puede estar vacío\./i);
    });
  });
});