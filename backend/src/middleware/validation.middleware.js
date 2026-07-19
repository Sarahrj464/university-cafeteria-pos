export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true, // we can allow unknown but standard Joi usage here
      stripUnknown: true, // strips any unvalidated fields to prevent parameters injection
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));

      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: details[0].message,
        details,
      });
    }

    req.body = value;
    next();
  };
}
