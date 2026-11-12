import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(8).max(14).default(10),

  HOLD_DURATION_MINUTES: Joi.number().integer().min(1).default(15),
  MAX_SEATS_PER_CUSTOMER: Joi.number().integer().min(1).default(4),
  CANCELLATION_CUTOFF_HOURS: Joi.number().integer().min(0).default(24),
});