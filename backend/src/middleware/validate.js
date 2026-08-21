export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_';
        fieldErrors[key] = issue.message;
      }
      return res.status(400).json({ error: 'Validation failed', fieldErrors });
    }
    req.body = result.data;
    next();
  };
}
