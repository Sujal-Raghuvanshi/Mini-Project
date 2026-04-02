const { z } = require('zod');

// Schema Definitions
const loginSchema = z.object({
  body: z.object({
    tenantId: z.string().min(1, "Tenant ID is required"),
    userId: z.string().min(1, "User ID / Email required"),
    password: z.string().min(1, "Password required")
  })
});

const registerTenantSchema = z.object({
  body: z.object({
    tenantId: z.string().min(3, "Tenant ID must be at least 3 chars"),
    tenantName: z.string().min(1, "Tenant name is required"),
    adminEmail: z.string().email("Must be a valid email format"),
    adminPassword: z.string().min(8, "Password must be at least 8 characters")
  })
});

const projectSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Project name must be at least 2 chars"),
    description: z.string().optional(),
    status: z.enum(['active', 'completed', 'archived']).default('active')
  })
});

const taskSchema = z.object({
  body: z.object({
    project_id: z.string().min(10, "Valid project ID is required"),
    title: z.string().min(1, "Task title is required"),
    assigned_to: z.string().optional(),
    is_completed: z.boolean().default(false)
  })
});

// Reusable Middleware Factory
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.map(err => ({
        field: err.path.join('.').replace('body.', ''),
        message: err.message
      }));
      return res.status(400).json({ error: "Validation Failed", details: fieldErrors });
    }
    next(error);
  }
};

module.exports = {
  validate,
  schemas: { loginSchema, registerTenantSchema, projectSchema, taskSchema }
};
