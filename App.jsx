import React, { useState, useEffect } from "react";

// ===== Data Layer =====

// Persistent key-value storage API mock
const storage = {
  getItem: (key) => JSON.parse(localStorage.getItem(key)),
  setItem: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

// Utility to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Schema/interfaces (Typescript-style)
// Defined in Commit 1: User, Bathroom, Review, Photo, etc.

// Data layer helper functions
const loadState = () => {
  const defaultState = {
    users: [],
    bathrooms: [],
    reviews: [],
    photos: [],
    votes: [],
    reports: [],
  };
  
  const state = storage.getItem("appState") || defaultState;
  
  // Preload 2 sample bathrooms if none exist
  if (state.bathrooms.length === 0) {
    state.bathrooms.push(
      { id: "bath1", name: "Central Park Restroom", address: "Central Park, NYC", type: "public", description: "Spacious and clean.", createdByUserId: null, lat: null, lng: null, createdAt: new Date().toISOString(), isHidden: false },
      { id: "bath2", name: "Starbucks Restroom", address: "5th Avenue, NYC", type: "cafe", description: "Moderate cleanliness.", createdByUserId: null, lat: null, lng: null, createdAt: new Date().toISOString(), isHidden: false }
    );
  }
  
  return state;
};

const saveState = (state) => {
  storage.setItem("appState", state);
};

const addBathroom = (newBathroom) => {
  const state = loadState();
  state.bathrooms.push({ id: generateId(), ...newBathroom, createdAt: new Date().toISOString(), isHidden: false });
  saveState(state);
};

const addReview = (newReview) => {
  const state = loadState();
  state.reviews.push({ id: generateId(), ...newReview, createdAt: new Date().toISOString() });
  saveState(state);
};

const calculateAverageRating = (bathroomId, reviews) => {
  const bathroomReviews = reviews.filter((r) => r.bathroomId === bathroomId);
  const total = bathroomReviews.reduce((sum, r) => sum + r.overallRating, 0);
  const count = bathroomReviews.length;
  return count > 0 ? (total / count).toFixed(1) : "N/A";
};

// ===== React Components =====

// BathroomCard Component: renders a bathroom in compact card form
const BathroomCard = ({ bathroom, reviews, onSelect }) => {
  const averageRating = calculateAverageRating(bathroom.id, reviews);
  return (
    <div className="bathroom-card" onClick={() => onSelect(bathroom)}>
      <h3>{bathroom.name}</h3>
      <p>Type: {bathroom.type}</p>
      <p>Address: {bathroom.address}</p>
      <p>Average Rating: {averageRating}</p>
    </div>
  );
};

// BathroomList Component: lists all bathrooms with filter and sort options
const BathroomList = ({ bathrooms, reviews, onSelect }) => {
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("name"); // "name", "newest", "rating"

  const filteredBathrooms = bathrooms
    .filter((bath) =>
      bath.name.toLowerCase().includes(search.toLowerCase()) || bath.address.toLowerCase().includes(search.toLowerCase())
    )
    .filter((bath) => {
      const avgRating = parseFloat(calculateAverageRating(bath.id, reviews));
      return isNaN(avgRating) || avgRating >= minRating;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "rating") {
        const ratingA = parseFloat(calculateAverageRating(a.id, reviews));
        const ratingB = parseFloat(calculateAverageRating(b.id, reviews));
        return ratingB - ratingA;
      }
      return 0;
    });

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name or address"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div>
        Filter: Minimum Rating:
        <input
          type="number"
          value={minRating}
          onChange={(e) => setMinRating(parseFloat(e.target.value))}
        />
      </div>
      <div>
        Sort By:
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Alphabetical</option>
          <option value="newest">Newest</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>
      {filteredBathrooms.map((bathroom) => (
        <BathroomCard
          key={bathroom.id}
          bathroom={bathroom}
          reviews={reviews}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

// BathroomDetail View
const BathroomDetail = ({ bathroom, reviews }) => {
  const bathroomReviews = reviews.filter((r) => r.bathroomId === bathroom.id);

  return (
    <div>
      <h2>{bathroom.name}</h2>
      <p>Address: {bathroom.address}</p>
      <p>Type: {bathroom.type}</p>
      <p>Description: {bathroom.description}</p>
      <ReviewList reviews={bathroomReviews} />
    </div>
  );
};

// ReviewList Component: lists reviews for a bathroom
const ReviewList = ({ reviews }) => (
  <ul>
    {reviews.map((review) => (
      <li key={review.id}>
        <p>Overall Rating: {review.overallRating}</p>
        <p>Cleanliness: {review.cleanlinessRating || "N/A"}</p>
        <p>Accessibility: {review.accessibilityRating || "N/A"}</p>
        <p>{review.text}</p>
      </li>
    ))}
  </ul>
);

// AddBathroomForm Component
const AddBathroomForm = ({ onAdd }) => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("public");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!name || !address) return alert("Name and address are required");
    onAdd({ name, address, type, description, createdByUserId: null });
    setName("");
    setAddress("");
    setType("public");
    setDescription("");
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="public">Public</option>
        <option value="cafe">Cafe</option>
        <option value="hotel">Hotel</option>
        <option value="gas_station">Gas Station</option>
        <option value="other">Other</option>
      </select>
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button onClick={handleAdd}>Add Bathroom</button>
    </div>
  );
};

// ===== App Component =====

const App = () => {
  const [state, setState] = useState(loadState());
  const [view, setView] = useState("list"); // "list", "add", "detail"
  const [selectedBathroom, setSelectedBathroom] = useState(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const handleAddBathroom = (bathroom) => {
    addBathroom(bathroom);
    setState(loadState());
    setView("list");
  };

  return (
    <div>
      <h1>Flush: Yelp for Bathrooms</h1>
      <nav>
        <button onClick={() => setView("list")}>List</button>
        <button onClick={() => setView("add")}>Add Bathroom</button>
      </nav>
      {view === "list" && (
        <BathroomList
          bathrooms={state.bathrooms}
          reviews={state.reviews}
          onSelect={(bathroom) => {
            setSelectedBathroom(bathroom);
            setView("detail");
          }}
        />
      )}
      {view === "add" && <AddBathroomForm onAdd={handleAddBathroom} />}
      {view === "detail" && selectedBathroom && (
        <BathroomDetail
          bathroom={selectedBathroom}
          reviews={state.reviews}
        />
      )}
    </div>
  );
};

export default App;
