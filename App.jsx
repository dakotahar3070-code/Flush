import React, { useState, useEffect } from "react";

/* ============================================================
   ===============  DATA LAYER — SCHEMA & STORAGE  =============
   ============================================================ */

// Persistent key-value storage wrapper
const storage = {
  get: (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

// Unique ID generator
const generateId = () => Math.random().toString(36).slice(2, 11);

// ---- Schema Versioning ----
const CURRENT_SCHEMA_VERSION = 1;

// ---- Default State ----
const defaultState = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  users: [],
  bathrooms: [],
  reviews: [],
  photos: [],
  votes: [],
  reports: [],
};

// ---- Migration Pipeline ----
const runMigrations = (state) => {
  let updated = { ...state };

  // Example future migration:
  // if (updated.schemaVersion === 1) { ... }

  updated.schemaVersion = CURRENT_SCHEMA_VERSION;
  return updated;
};

// ---- Load State ----
const loadState = () => {
  const saved = storage.get("appState");

  if (!saved) {
    return defaultState;
  }

  // Ensure missing keys are filled
  const merged = { ...defaultState, ...saved };

  // Run migrations if needed
  if (merged.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return runMigrations(merged);
  }

  return merged;
};

// ---- Save State ----
const saveState = (state) => {
  storage.set("appState", state);
};

// ---- CRUD Helpers ----
const Data = {
  addUser(state, username) {
    const user = {
      id: generateId(),
      username,
      createdAt: new Date().toISOString(),
    };
    return { ...state, users: [...state.users, user] };
  },

  addBathroom(state, data) {
    const bathroom = {
      id: generateId(),
      isHidden: false,
      createdAt: new Date().toISOString(),
      ...data,
    };
    return { ...state, bathrooms: [...state.bathrooms, bathroom] };
  },

  addReview(state, data) {
    const review = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    return { ...state, reviews: [...state.reviews, review] };
  },

  addPhoto(state, data) {
    const photo = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    return { ...state, photos: [...state.photos, photo] };
  },
};

/* ============================================================
   =======================  APP ROOT  ==========================
   ============================================================ */

const App = () => {
  const [state, setState] = useState(loadState());

  // Persist on every change
  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Flush 🚽 — Yelp for Bathrooms</h1>
      <p>Commit 1: Schema + Data Layer Ready</p>

      <pre style={{ background: "#eee", padding: 10 }}>
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
};

export default App;
