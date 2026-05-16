/**
 * AI Notes — MongoDB schema bootstrap
 *
 * Paste into mongosh, or run:
 *   mongosh "mongodb://localhost:27017" --file backend/app/models/init_schema.js
 *
 * Change DB_NAME if your DATABASE_NAME in backend/.env differs.
 */

const DB_NAME = "ai_notes";

db = db.getSiblingDB(DB_NAME);

function ensureCollection(name, options) {
  const exists = db.getCollectionNames().includes(name);
  if (!exists) {
    db.createCollection(name, options);
    return;
  }
  if (options.validator) {
    db.runCommand({
      collMod: name,
      validator: options.validator,
      validationLevel: options.validationLevel || "moderate",
      validationAction: options.validationAction || "error",
    });
  }
}

// ---------------------------------------------------------------------------
// Drop existing (optional — uncomment to reset)
// ---------------------------------------------------------------------------
// db.users.drop();
// db.notes.drop();

// ---------------------------------------------------------------------------
// users collection
// Document shape (app stores _id as string, e.g. USR_A1B2C3D4):
// {
//   _id: "USR_001",
//   name: "John Doe",
//   email: "john@example.com",      // lowercase, unique
//   password_hash: "<bcrypt hash>"
// }
// ---------------------------------------------------------------------------

const usersValidator = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "name", "email", "password_hash"],
      additionalProperties: false,
      properties: {
        _id: {
          bsonType: "string",
          description: "User id (USR_xxxxxxxx)",
        },
        name: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100,
        },
        email: {
          bsonType: "string",
          pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
          description: "Lowercase email",
        },
        password_hash: {
          bsonType: "string",
          description: "bcrypt hash from passlib",
        },
      },
    },
  },
  validationLevel: "moderate",
  validationAction: "error",
};

ensureCollection("users", usersValidator);

db.users.createIndex({ email: 1 }, { unique: true, name: "idx_users_email_unique" });

// ---------------------------------------------------------------------------
// notes collection
// Document shape (app stores _id as string, e.g. NOTE_A1B2C3D4):
// {
//   _id: "NOTE_001",
//   user_id: "USR_001",
//   title: "Project Planning",
//   content: "Meeting notes...",
//   tags: ["work", "meeting"],
//   category: "work",
//   archived: false,
//   is_public: false,
//   share_id: "abc123share", // omitted until the note is shared
//   summary: null | "AI summary text",
//   action_items: ["Follow up with team"],
//   created_at: ISODate(...),
//   updated_at: ISODate(...)
// }
// ---------------------------------------------------------------------------

const notesValidator = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "_id",
        "user_id",
        "title",
        "content",
        "tags",
        "category",
        "archived",
        "is_public",
        "action_items",
        "created_at",
        "updated_at",
      ],
      additionalProperties: false,
      properties: {
        _id: {
          bsonType: "string",
          description: "Note id (NOTE_xxxxxxxx)",
        },
        user_id: {
          bsonType: "string",
          description: "Owner user _id",
        },
        title: { bsonType: "string" },
        content: { bsonType: "string" },
        tags: {
          bsonType: "array",
          items: { bsonType: "string" },
        },
        category: { bsonType: "string" },
        archived: { bsonType: "bool" },
        is_public: { bsonType: "bool" },
        share_id: {
          bsonType: ["string", "null"],
          description: "Public share token when is_public is true",
        },
        summary: {
          bsonType: ["string", "null"],
        },
        action_items: {
          bsonType: "array",
          items: { bsonType: "string" },
        },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },
      },
    },
  },
  validationLevel: "moderate",
  validationAction: "error",
};

ensureCollection("notes", notesValidator);

db.notes.createIndex({ user_id: 1 }, { name: "idx_notes_user_id" });
db.notes.createIndex(
  { share_id: 1 },
  {
    unique: true,
    name: "idx_notes_share_id_unique_sparse",
    partialFilterExpression: { share_id: { $type: "string" } },
  }
);
db.notes.createIndex(
  { user_id: 1, updated_at: -1 },
  { name: "idx_notes_user_updated" }
);
// Text search helper (optional; app uses regex — useful for Atlas Search later)
db.notes.createIndex(
  { title: "text", content: "text", tags: "text" },
  { name: "idx_notes_text_search", default_language: "english" }
);

// ---------------------------------------------------------------------------
// Sample seed data (demo user password: password123)
// bcrypt hash generated with passlib/bcrypt
// ---------------------------------------------------------------------------

const now = new Date();
const demoUserId = "USR_DEMO0001";
const demoNoteId = "NOTE_DEMO0001";

// Remove previous demo rows so re-run is idempotent
db.users.deleteOne({ _id: demoUserId });
db.notes.deleteMany({ user_id: demoUserId });

db.users.insertOne({
  _id: demoUserId,
  name: "John Doe",
  email: "john@example.com",
  // password: password123
  password_hash: "$2b$12$BAUHI8CZL1.yKMfkE24C5e.T/5CzuiCEXwU3YJW/arHhCW3lad17S",
});

db.notes.insertOne({
  _id: demoNoteId,
  user_id: demoUserId,
  title: "Project Planning",
  content:
    "Q2 roadmap review with the team.\n\n- Finalize MVP scope\n- Schedule design review\n- Todo: send recap to stakeholders",
  tags: ["work", "meeting"],
  category: "work",
  archived: false,
  is_public: true,
  share_id: "demo_share_01",
  summary: "Q2 roadmap meeting covering MVP scope, design review, and stakeholder follow-up.",
  action_items: [
    "Finalize MVP scope",
    "Schedule design review",
    "Send recap to stakeholders",
  ],
  created_at: now,
  updated_at: now,
});

print("Database:", DB_NAME);
print("Collections:", db.getCollectionNames());
print("users indexes:", db.users.getIndexes().map((i) => i.name));
print("notes indexes:", db.notes.getIndexes().map((i) => i.name));
print("");
print("Demo login: john@example.com / password123");
print("Demo shared note: GET /shared/demo_share_01");
