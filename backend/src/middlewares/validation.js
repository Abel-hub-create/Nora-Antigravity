export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Pass full request context for body, query, params validation
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Update req with parsed/transformed values
      if (result.body) req.body = result.body;
      if (result.query) req.query = result.query;
      if (result.params) req.params = result.params;

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
