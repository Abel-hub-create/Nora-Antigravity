export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      const errors = error.errors?.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })) || [];

      return res.status(400).json({
        error: 'Données invalides',
        details: errors
      });
    }
  };
};
