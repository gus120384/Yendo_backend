// tests/auth.test.js
const request = require('supertest');
const app = require('../app');
const { User, sequelize } = require('../models'); 

describe('Auth Routes - /api/auth', () => {
  beforeEach(async () => {
    await User.destroy({ where: {}, truncate: true, cascade: true, restartIdentity: true });
  });

  describe('POST /api/auth/register', () => {
    const baseNewUser = { 
      nombre: 'Test',
      apellido: 'User',
      telefono: '1234567890',
      rol: 'cliente',
    };

    it('should register a new user successfully and return a token', async () => {
      const newUser = {
        ...baseNewUser,
        email: 'test.register.success@example.com',
        password: 'Password123!',
      };
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', newUser.email.toLowerCase());
      expect(response.body.data.user).not.toHaveProperty('password');

      const dbUser = await User.findOne({ where: { email: newUser.email } });
      expect(dbUser).not.toBeNull();
      expect(dbUser.nombre).toBe(newUser.nombre);
      expect(dbUser.password).not.toBe(newUser.password);
    });

    it('should return 400 if email already exists', async () => {
      const existingUser = {
        ...baseNewUser,
        email: 'existing.register@example.com',
        password: 'Password123!',
      };
      await User.create(existingUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(existingUser); 

      expect(response.statusCode).toBe(400); 
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body.message).toMatch(/El email 'existing.register@example.com' ya está registrado/i);
    });

    it('should return 400 for missing required fields (e.g., password)', async () => {
      const incompleteUser = { 
        nombre: 'Test',
        apellido: 'User',
        email: 'missing.fields@example.com',
      };
      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteUser);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('status', 'fail');
      expect(response.body.message).toMatch(/Nombre, apellido, email y contraseña son requeridos/i); 
    });

    it('should return 400 if password is too short', async () => {
      const shortPasswordUser = {
        ...baseNewUser,
        email: 'shortpass.register@example.com',
        password: 'short',
      };
      const response = await request(app)
        .post('/api/auth/register')
        .send(shortPasswordUser);
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/La contraseña debe tener al menos 8 caracteres/i);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidEmailUser = {
        ...baseNewUser,
        email: 'invalidemailformat', // Email inválido
        password: 'Password123!',
      };
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailUser);
      expect(response.statusCode).toBe(400);
      // Ahora esperamos que el mensaje venga directamente de la validación del modelo
      // y que el authController lo haya pasado al manejador de errores global.
      expect(response.body.message).toMatch(/Debe proporcionar un correo electrónico válido/i);
    });
  });

  describe('POST /api/auth/login', () => {
    const loginUserCredentials = {
      email: 'login.test@example.com',
      password: 'Password123!',
    };

    const userDataForLogin = {
      nombre: 'Login',
      apellido: 'Test',
      email: loginUserCredentials.email,
      password: loginUserCredentials.password,
      telefono: '0987654321',
      rol: 'cliente',
      activo: true,
    };

    beforeEach(async () => {
      await User.create(userDataForLogin);
    });

    it('should login an existing active user and return a token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginUserCredentials);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(loginUserCredentials.email.toLowerCase());
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUserCredentials.email,
          password: 'WrongPassword!',
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toMatch(/Credenciales incorrectas \(email o contraseña no válidos\)\./i);
    });

    it('should return 401 if user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        });

      expect(response.statusCode).toBe(401);
      expect(response.body.message).toMatch(/Credenciales incorrectas \(email o contraseña no válidos\)\./i);
    });

    it('should return 403 if user is inactive', async () => {
      await User.update({ activo: false }, { where: { email: loginUserCredentials.email } });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginUserCredentials);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toMatch(/Esta cuenta de usuario ha sido desactivada\. Por favor, contacte al administrador\./i);
    });
  });

  describe('PATCH /api/auth/updateMyPassword', () => {
    let userToken;
    const userCredentials = {
      email: 'updatepass.test@example.com',
      password: 'OldPassword123!', 
    };
    const userDataForUpdatePassword = {
      nombre: 'UpdatePass',
      apellido: 'User',
      email: userCredentials.email,
      password: userCredentials.password,
      rol: 'cliente',
      activo: true,
    };

    beforeEach(async () => {
      await User.create(userDataForUpdatePassword);
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(userCredentials);
      userToken = loginResponse.body.token;
      expect(userToken).toBeDefined(); 
    });

    it('should update password successfully and return a new token', async () => {
      const newPassword = 'NewStrongPassword123!';
      const response = await request(app)
        .patch('/api/auth/updateMyPassword')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          passwordCurrent: userCredentials.password,
          password: newPassword,
          passwordConfirm: newPassword,
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).not.toBe(userToken); 

      const loginWithNewPass = await request(app)
        .post('/api/auth/login')
        .send({ email: userCredentials.email, password: newPassword });
      expect(loginWithNewPass.statusCode).toBe(200);
      
      const loginWithOldPass = await request(app)
        .post('/api/auth/login')
        .send({ email: userCredentials.email, password: userCredentials.password });
      expect(loginWithOldPass.statusCode).toBe(401);
    });

    it('should return 401 if not authenticated (no token provided)', async () => {
      const response = await request(app)
        .patch('/api/auth/updateMyPassword')
        .send({
          passwordCurrent: userCredentials.password,
          password: 'NewPassword123!',
          passwordConfirm: 'NewPassword123!',
        });
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toMatch(/No estás autenticado\. Por favor, inicia sesión para obtener acceso\./i);
    });

    it('should return 401 for incorrect current password', async () => {
      const response = await request(app)
        .patch('/api/auth/updateMyPassword')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          passwordCurrent: 'WrongOldPassword!',
          password: 'NewPassword123!',
          passwordConfirm: 'NewPassword123!',
        });
      expect(response.statusCode).toBe(401); 
      expect(response.body.message).toMatch(/Contraseña actual incorrecta\./i);
    });

    it('should return 400 if new password and confirmation do not match', async () => {
      const response = await request(app)
        .patch('/api/auth/updateMyPassword')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          passwordCurrent: userCredentials.password,
          password: 'NewPassword123!',
          passwordConfirm: 'DifferentNewPassword123!',
        });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/La nueva contraseña y su confirmación no coinciden\./i);
    });

    it('should return 400 if new password is too short', async () => {
      const response = await request(app)
        .patch('/api/auth/updateMyPassword')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          passwordCurrent: userCredentials.password,
          password: 'short',
          passwordConfirm: 'short',
        });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/La nueva contraseña debe tener al menos 8 caracteres\./i);
    });

    it('should return 400 if new password is the same as the old password', async () => {
      const response = await request(app)
        .patch('/api/auth/updateMyPassword')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          passwordCurrent: userCredentials.password,
          password: userCredentials.password, 
          passwordConfirm: userCredentials.password,
        });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toMatch(/La nueva contraseña no puede ser igual a la contraseña actual\./i);
    });
  });

  afterAll(async () => {
    await sequelize.close(); 
  });
});