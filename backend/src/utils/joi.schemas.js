import Joi from 'joi';

// Password pattern: min 8 characters, at least 1 uppercase letter, 1 number, and 1 special character
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Student ID pattern: e.g., STU-2024-001 or standard alphanumeric
const studentIdPattern = /^[A-Za-z0-9\-]{3,20}$/;

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required',
  }),
});

export const registerSchema = Joi.object({
  name: Joi.string().max(100).required(),
  email: Joi.string().email().max(150).required(),
  password: Joi.string().min(8).pattern(passwordPattern).required().messages({
    'string.pattern.base': 'Password must contain at least 1 uppercase letter, 1 number, and 1 special character',
    'string.min': 'Password must be at least 8 characters long',
  }),
  role: Joi.string().valid('admin', 'cashier', 'kitchen', 'student').required(),
  studentId: Joi.string().pattern(studentIdPattern).allow('', null).messages({
    'string.pattern.base': 'Student ID format is invalid',
  }),
  confirmPassword: Joi.any(),
});

export const menuItemSchema = Joi.object({
  name: Joi.string().max(100).required(),
  categoryId: Joi.string().uuid().required(),
  price: Joi.number().positive().required().messages({
    'number.positive': 'Price must be a positive number',
  }),
  imageUrl: Joi.string().uri().allow('', null),
  prepTimeMinutes: Joi.number().integer().min(0).default(5),
  allergens: Joi.array().items(Joi.string()).default([]),
  dietaryTags: Joi.array().items(Joi.string()).default([]),
  nutritionalInfo: Joi.object().default({}),
  modifiers: Joi.array().items(Joi.object()).default([]),
});

export const orderItemSchema = Joi.object({
  menuItemId: Joi.string().uuid().required(),
  name: Joi.string().required(),
  quantity: Joi.number().integer().positive().required().messages({
    'number.positive': 'Quantity must be a positive integer',
    'number.integer': 'Quantity must be a positive integer',
  }),
  unitPrice: Joi.number().positive().required(),
  modifiers: Joi.array().items(Joi.object()).default([]),
  subtotal: Joi.number().positive().required(),
});

export const orderSchema = Joi.object({
  items: Joi.array().items(orderItemSchema).min(1).required().messages({
    'array.min': 'Order must contain at least one item',
  }),
  subtotal: Joi.number().min(0).required(),
  discountAmount: Joi.number().min(0).default(0),
  taxAmount: Joi.number().min(0).required(),
  totalAmount: Joi.number().positive().required().messages({
    'number.positive': 'Total amount must be positive',
  }),
  paymentMethod: Joi.string()
    .valid('cash', 'card', 'meal_plan', 'campus_wallet', 'qr_upi', 'split')
    .allow(null),
  notes: Joi.string().allow('', null),
  studentId: Joi.string().pattern(studentIdPattern).allow('', null),
  status: Joi.string()
    .valid('pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled')
    .default('pending'),
});

export const shiftOpenSchema = Joi.object({
  openingCash: Joi.number().min(0).required().messages({
    'number.min': 'Opening cash cannot be negative',
  }),
});

export const shiftCloseSchema = Joi.object({
  closingCash: Joi.number().min(0).required().messages({
    'number.min': 'Closing cash cannot be negative',
  }),
});
