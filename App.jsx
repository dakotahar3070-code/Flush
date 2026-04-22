import React, { useState, useEffect } from "react";

// ===== Data Layer =====

const storage = {
  getItem: (key) => {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  setItem: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

const generateId = () => Math.random().toString(36).substr(2, 9);

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

  if (state.bathrooms.length === 0) {
    const now = new Date().toISOString();
    state.bathrooms.push(
      {
        id: "bath1",
        name: "Central Park Restroom",
        address: "Central Park, NYC",
        type: "public",
        description: "Spacious and clean.",
        createdByUserId: null,
        lat: null,
        lng: null,
        createdAt: now,
        isHidden: false,
      },
      {
        id: "bath2",
        name: "Starbucks Restroom",
        address: "5th Avenue, NYC",
        type: "cafe",
        description: "Moderate cleanliness.",
        createdByUserId: null,
        lat: null,
        lng: null,
        createdAt: now,
        isHidden: false,
      }
    );
  }

  return state;
};

const saveState = (state) => storage.setItem("appState", state);

const calculateAverageRating = (bathroomId, reviews) => {
  const bathroomReviews = reviews.filter((r) => r.bathroomId === bathroomId);
  if (bathroomReviews.length === 0) return "N/A";
  const total = bathroomReviews.reduce((sum, r) => sum + r.overallRating, 0);
  return (total / bathroomReviews.length).toFixed(1);
};

const addBathroom = (newBathroom, photoDataUrls) => {
  const state = loadState();
  const bathroomId = generateId();
  const bathroom = {
    id: bathroomId,
    ...newBathroom,
    createdAt: new Date().toISOString(),
    isHidden: false,
  };
  state.bathrooms.push(bathroom);

  if (photoDataUrls && photoDataUrls.length > 0) {
    const now = new Date().toISOString();
    const photos = photoDataUrls.map((dataUrl) => ({
      id: generateId(),
      bathroomId,
      reviewId: null,
      dataUrl,
      createdAt: now,
    }));
    state.photos.push(...photos);
  }

  saveState(state);
};

const addReview = (newReview, photoDataUrls) => {
  const state = loadState();
  const reviewId = generateId();
  const review = {
    id: reviewId,
    ...newReview,
    createdAt: new Date().toISOString(),
  };
  state.reviews.push(review);

  if (photoDataUrls && photoDataUrls.length > 0) {
    const now = new Date().toISOString();
    const photos = photoDataUrls.map((dataUrl) => ({
      id: generateId(),
      bathroomId: null,
      reviewId,
      dataUrl,
      createdAt: now,
    }));
    state.photos.push(...photos);
  }

  saveState(state);
};

// ===== UI Helpers =====

const BathroomCard = ({ bathroom, reviews, photos, onSelect }) => {
  const avg = calculateAverageRating(bathroom.id, reviews);
  const bathroomPhotos = photos.filter((p) => p.bathroomId === bathroom.id);
  const thumbnail = bathroomPhotos[0]?.dataUrl;

  return (
    <div
      className="bathroom-card"
      onClick={() => onSelect(bathroom)}
      style={{
        border: "1px solid #ccc",
        padding: 10,
        marginBottom: 10,
        display: "flex",
        gap: 10,
        cursor: "pointer",
      }}
    >
      {thumbnail && (
        <img
          src={thumbnail}
          alt="Bathroom"
          style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4 }}
        />
      )}
      <div>
        <h3 style={{ margin: 0 }}>{bathroom.name}</h3>
        <p style={{ margin: "4px 0" }}>Type: {bathroom.type}</p>
        <p style={{ margin: "4px 0" }}>Address: {bathroom.address}</p>
        <p style={{ margin: "4px 0" }}>Average Rating: {avg}</p>
      </div>
    </div>
  );
};

const BathroomList = ({ bathrooms, reviews, photos, onSelect }) => {
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("name");

  const filtered = bathrooms
    .filter((b) => {
      const q = search.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q)
      );
    })
    .filter((b) => {
      const avg = parseFloat(calculateAverageRating(b.id, reviews));
      if (isNaN(avg)) return true;
      return avg >= minRating;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "newest")
        return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "rating") {
        const ra = parseFloat(calculateAverageRating(a.id, reviews)) || 0;
        const rb = parseFloat(calculateAverageRating(b.id, reviews)) || 0;
        return rb - ra;
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
        style={{ display: "block", marginBottom: 8, width: "100%" }}
      />
      <div style={{ marginBottom: 8 }}>
        <label>
          Min Rating:{" "}
          <input
            type="number"
            min="0"
            max="5"
            step="0.5"
            value={minRating}
            onChange={(e) => setMinRating(parseFloat(e.target.value) || 0)}
          />
        </label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>
          Sort by:{" "}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Alphabetical</option>
            <option value="newest">Newest</option>
            <option value="rating">Highest Rated</option>
          </select>
        </label>
      </div>
      {filtered.map((b) => (
        <BathroomCard
          key={b.id}
          bathroom={b}
          reviews={reviews}
          photos={photos}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

const PhotoUploader = ({ onFilesChange, maxCount = 5 }) => {
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    const valid = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Each file must be under 2MB.");
        return;
      }
      valid.push(file);
    }

    if (selected.length + valid.length > maxCount) {
      setError(`You can upload up to ${maxCount} images.`);
      return;
    }

    const dataUrls = await Promise.all(
      valid.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          })
      )
    );

    const next = [...selected, ...dataUrls];
    setSelected(next);
    setError("");
    onFilesChange(next);
  };

  const removeAt = (index) => {
    const next = [...selected];
    next.splice(index, 1);
    setSelected(next);
    onFilesChange(next);
  };

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <input type="file" multiple accept="image/*" onChange={handleFiles} />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {selected.map((src, i) => (
          <div key={i} style={{ position: "relative" }}>
            <img
              src={src}
              alt="Preview"
              style={{
                width: 60,
                height: 60,
                objectFit: "cover",
                borderRadius: 4,
              }}
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                fontSize: 10,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const BathroomDetail = ({ bathroom, reviews, photos }) => {
  const bathroomReviews = reviews.filter((r) => r.bathroomId === bathroom.id);
  const bathroomPhotos = photos.filter((p) => p.bathroomId === bathroom.id);

  return (
    <div>
      <h2>{bathroom.name}</h2>
      <p>Address: {bathroom.address}</p>
      <p>Type: {bathroom.type}</p>
      <p>Description: {bathroom.description}</p>

      {bathroomPhotos.length > 0 && (
        <div style={{ margin: "10px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {bathroomPhotos.map((p) => (
            <img
              key={p.id}
              src={p.dataUrl}
              alt="Bathroom"
              style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 4 }}
            />
          ))}
        </div>
      )}

      <h3>Reviews</h3>
      <ReviewList reviews={bathroomReviews} photos={photos} />
    </div>
  );
};

const ReviewList = ({ reviews, photos }) => {
  if (reviews.length === 0) return <p>No reviews yet.</p>;

  return (
    <ul style={{ paddingLeft: 16 }}>
      {reviews.map((r) => {
        const reviewPhotos = photos.filter((p) => p.reviewId === r.id);
        return (
          <li key={r.id} style={{ marginBottom: 12 }}>
            <p>Overall: {r.overallRating}</p>
            <p>Cleanliness: {r.cleanlinessRating ?? "N/A"}</p>
            <p>Accessibility: {r.accessibilityRating ?? "N/A"}</p>
            <p>{r.text}</p>
            {reviewPhotos.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                {reviewPhotos.map((p) => (
                  <img
                    key={p.id}
                    src={p.dataUrl}
                    alt="Review"
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: "cover",
                      borderRadius: 4,
                    }}
                  />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

const AddBathroomForm = ({ onAdd }) => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("public");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);

  const handleSubmit = () => {
    if (!name || !address) {
      alert("Name and address are required");
      return;
    }
    onAdd(
      {
        name,
        address,
        type,
        description,
        createdByUserId: null,
        lat: null,
        lng: null,
      },
      photos
    );
    setName("");
    setAddress("");
    setType("public");
    setDescription("");
    setPhotos([]);
  };

  return (
    <div>
      <h2>Add Bathroom</h2>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ display: "block", marginBottom: 8, width: "100%" }}
      />
      <input
        type="text"
        placeholder="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        style={{ display: "block", marginBottom: 8, width: "100%" }}
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={{ display: "block", marginBottom: 8 }}
      >
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
        style={{ display: "block", marginBottom: 8, width: "100%" }}
      />
      <p>Bathroom photos (up to 5):</p>
      <PhotoUploader onFilesChange={setPhotos} maxCount={5} />
      <button onClick={handleSubmit}>Add Bathroom</button>
    </div>
  );
};

const AddReviewForm = ({ bathroomId, onAdded }) => {
  const [overall, setOverall] = useState(5);
  const [cleanliness, setCleanliness] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState([]);

  const handleSubmit = () => {
    if (!overall) {
      alert("Overall rating is required");
      return;
    }
    addReview(
      {
        bathroomId,
        userId: null,
        overallRating: Number(overall),
        cleanlinessRating: cleanliness ? Number(cleanliness) : null,
        accessibilityRating: accessibility ? Number(accessibility) : null,
        text,
      },
      photos
    );
    onAdded();
    setOverall(5);
    setCleanliness("");
    setAccessibility("");
    setText("");
    setPhotos([]);
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Add Review</h3>
      <label>
        Overall (1–5):{" "}
        <input
          type="number"
          min="1"
          max="5"
          value={overall}
          onChange={(e) => setOverall(e.target.value)}
        />
      </label>
      <br />
      <label>
        Cleanliness (1–5):{" "}
        <input
          type="number"
          min="1"
          max="5"
          value={cleanliness}
          onChange={(e) => setCleanliness(e.target.value)}
        />
      </label>
      <br />
      <label>
        Accessibility (1–5):{" "}
        <input
          type="number"
          min="1"
          max="5"
          value={accessibility}
          onChange={(e) => setAccessibility(e.target.value)}
        />
      </label>
      <br />
      <textarea
        placeholder="Write your review..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ display: "block", marginTop: 8, width: "100%" }}
      />
      <p>Review photos (up to 5):</p>
      <PhotoUploader onFilesChange={setPhotos} maxCount={5} />
      <button onClick={handleSubmit} style={{ marginTop: 8 }}>
        Submit Review
      </button>
    </div>
  );
};

// ===== App =====

const App = () => {
  const [state, setState] = useState(loadState());
  const [view, setView] = useState("list");
  const [selectedBathroom, setSelectedBathroom] = useState(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const refresh = () => setState(loadState());

  const handleAddBathroom = (bathroom, photos) => {
    addBathroom(bathroom, photos);
    refresh();
    setView("list");
  };

  const handleReviewAdded = () => {
    refresh();
  };

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <h1>Flush 🚽 — Yelp for Bathrooms</h1>
      <nav style={{ marginBottom: 16 }}>
        <button onClick={() => setView("list")}>List</button>{" "}
        <button onClick={() => setView("add")}>Add Bathroom</button>
      </nav>

      {view === "list" && (
        <BathroomList
          bathrooms={state.bathrooms}
          reviews={state.reviews}
          photos={state.photos}
          onSelect={(bathroom) => {
            setSelectedBathroom(bathroom);
            setView("detail");
          }}
        />
      )}

      {view === "add" && <AddBathroomForm onAdd={handleAddBathroom} />}

      {view === "detail" && selectedBathroom && (
        <div>
          <button onClick={() => setView("list")}>← Back to list</button>
          <BathroomDetail
            bathroom={selectedBathroom}
            reviews={state.reviews}
            photos={state.photos}
          />
          <AddReviewForm
            bathroomId={selectedBathroom.id}
            onAdded={handleReviewAdded}
          />
        </div>
      )}
    </div>
  );
};

export default App;
