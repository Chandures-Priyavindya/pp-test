const { ValidationError } = require('./errors');

/**
 * Production-grade Validation Schemas
 */

const validateAuthenticateRequest = (data) => {
  const errors = [];

  if (!data.grantType || typeof data.grantType !== 'string') {
    errors.push({
      field: 'grantType',
      message: 'grantType is required and must be a string'
    });
  }

  if (data.grantType && data.grantType !== 'client_credentials') {
    errors.push({
      field: 'grantType',
      message: 'Only client_credentials grant type is supported'
    });
  }

  if (!data.clientId || typeof data.clientId !== 'string') {
    errors.push({
      field: 'clientId',
      message: 'clientId is required and must be a string'
    });
  }

  if (data.clientId && data.clientId.length < 3) {
    errors.push({
      field: 'clientId',
      message: 'clientId must be at least 3 characters long'
    });
  }

  if (!data.clientSecret || typeof data.clientSecret !== 'string') {
    errors.push({
      field: 'clientSecret',
      message: 'clientSecret is required and must be a string'
    });
  }

  if (data.clientSecret && data.clientSecret.length < 8) {
    errors.push({
      field: 'clientSecret',
      message: 'clientSecret must be at least 8 characters long'
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid authentication request', { validationErrors: errors });
  }

  return true;
};

const validateRefreshTokenRequest = (data) => {
  const errors = [];

  if (!data.refreshToken || typeof data.refreshToken !== 'string') {
    errors.push({
      field: 'refreshToken',
      message: 'refreshToken is required and must be a string'
    });
  }

  if (data.refreshToken && data.refreshToken.length < 50) {
    errors.push({
      field: 'refreshToken',
      message: 'refreshToken format is invalid'
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid refresh token request', { validationErrors: errors });
  }

  return true;
};

const validateTokenHeader = (authHeader) => {
  const errors = [];

  if (!authHeader) {
    errors.push({
      field: 'authorization',
      message: 'Authorization header is required'
    });
  }

  if (authHeader && !authHeader.startsWith('Bearer ')) {
    errors.push({
      field: 'authorization',
      message: 'Authorization header must start with "Bearer "'
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Invalid authorization header', { validationErrors: errors });
  }

  return authHeader.substring(7);
};

const validatePasswordStrength = (password) => {
  const errors = [];
  const minLength = 12;

  if (!password || password.length < minLength) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${minLength} characters`
    });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter'
    });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter'
    });
  }

  if (!/\d/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one number'
    });
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one special character'
    });
  }

  if (errors.length > 0) {
    throw new ValidationError('Password does not meet strength requirements', { validationErrors: errors });
  }

  return true;
};

module.exports = {
  validateAuthenticateRequest,
  validateRefreshTokenRequest,
  validateTokenHeader,
  validatePasswordStrength
};
