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
        lat: 40.785091,
        lng: -73.968285,
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
        lat: 40.754932,
        lng: -73.984016,
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

// ===== Voting Logic =====

const getVotesForReview = (reviewId, votes) =>
  votes.filter((v) => v.reviewId === reviewId);

const calculateVoteScore = (reviewId, votes) =>
  getVotesForReview(reviewId, votes).reduce((sum, v) => sum + v.value, 0);

const getUserVote = (reviewId, userId, votes) =>
  votes.find((v) => v.reviewId === reviewId && v.userId === userId);

const addVote = (reviewId, userId, value) => {
  const state = loadState();
  const existing = getUserVote(reviewId, userId, state.votes);

  if (existing) {
    if (existing.value === value) {
      state.votes = state.votes.filter((v) => v.id !== existing.id);
    } else {
      existing.value = value;
      existing.createdAt = new Date().toISOString();
    }
  } else {
    state.votes.push({
      id: generateId(),
      reviewId,
      userId,
      value,
      createdAt: new Date().toISOString(),
    });
  }

  saveState(state);
};

// ===== Utilities =====

// Haversine distance in miles
const distanceMiles = (lat1, lng1, lat2, lng2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Simple normalized map space (NYC-ish bounds)
const MAP_LAT_RANGE = { min: 40.7, max: 40.8 };
const MAP_LNG_RANGE = { min: -74.0, max: -73.9 };

const normalizeCoordinates = (lat, lng) => {
  const x =
    ((lng - MAP_LNG_RANGE.min) / (MAP_LNG_RANGE.max - MAP_LNG_RANGE.min)) *
    100;
  const y =
    ((MAP_LAT_RANGE.max - lat) /
      (MAP_LAT_RANGE.max - MAP_LAT_RANGE.min)) *
    100;
  return { x, y };
};

// ===== Map Styling =====

const mapBackgroundStyle = {
  backgroundImage:
    "linear-gradient(#f5f7fa 1px, transparent 1px), linear-gradient(90deg, #f5f7fa 1px, transparent 1px)",
  backgroundSize: "20px 20px",
  backgroundColor: "#e3edf7",
};

// ===== UI Components =====

const BathroomPinColors = {
  public: "blue",
  cafe: "green",
  hotel: "orange",
  gas_station: "red",
  other: "purple",
};

const MapView = ({ bathrooms, userLocation, onSelect }) => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 400,
        border: "1px solid #ccc",
        borderRadius: 8,
        overflow: "hidden",
        ...mapBackgroundStyle,
      }}
    >
      {userLocation && (
        <div
          style={{
            position: "absolute",
            top: `${normalizeCoordinates(userLocation.lat, userLocation.lng).y}%`,
            left: `${normalizeCoordinates(userLocation.lat, userLocation.lng).x}%`,
            width: 14,
            height: 14,
            backgroundColor: "teal",
            borderRadius: "50%",
            border: "2px solid white",
            transform: "translate(-50%, -50%)",
          }}
          title="You are here"
        />
      )}

      {bathrooms.map((bathroom) => {
        if (!bathroom.lat || !bathroom.lng) return null;
        const coords = normalizeCoordinates(bathroom.lat, bathroom.lng);
        const pinColor = BathroomPinColors[bathroom.type] || "gray";

        return (
          <div
            key={bathroom.id}
            title={bathroom.name}
            style={{
              position: "absolute",
              top: `${coords.y}%`,
              left: `${coords.x}%`,
              width: 16,
              height: 16,
              backgroundColor: pinColor,
              borderRadius: "50%",
              border: "2px solid white",
              transform: "translate(-50%, -50%)",
              cursor: "pointer",
              boxShadow: "0 0 4px rgba(0,0,0,0.3)",
            }}
            onClick={() => onSelect(bathroom)}
          />
        );
      })}
    </div>
  );
};

const MiniMap = ({ lat, lng }) => {
  if (!lat || !lng) return <p>No location available</p>;
  const coords = normalizeCoordinates(lat, lng);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 200,
        border: "1px solid #ccc",
        borderRadius: 8,
        marginTop: 12,
        ...mapBackgroundStyle,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: `${coords.y}%`,
          left: `${coords.x}%`,
          width: 16,
          height: 16,
          backgroundColor: "blue",
          borderRadius: "50%",
          border: "2px solid white",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
};

const BathroomCard = ({ bathroom, reviews, photos, userLocation, onSelect }) => {
  const avg = calculateAverageRating(bathroom.id, reviews);
  const bathroomPhotos = photos.filter((p) => p.bathroomId === bathroom.id);
  const thumbnail = bathroomPhotos[0]?.dataUrl;

  const distance =
    userLocation && bathroom.lat && bathroom.lng
      ? distanceMiles(
          userLocation.lat,
          userLocation.lng,
          bathroom.lat,
          bathroom.lng
        ).toFixed(1)
      : null;

  return (
    <div
      onClick={() => onSelect(bathroom)}
      style={{
        border: "1px solid #ccc",
        padding: 10,
        marginBottom: 10,
        display: "flex",
        gap: 10,
        cursor: "pointer",
        borderRadius: 6,
        background: "#fff",
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
        {distance && <p style={{ margin: "4px 0" }}>{distance} miles away</p>}
        <p style={{ margin: "4px 0" }}>Average Rating: {avg}</p>
      </div>
    </div>
  );
};

const BathroomList = ({
  bathrooms,
  reviews,
  photos,
  userLocation,
  onRequestLocation,
  onSelect,
}) => {
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
      if (sortBy === "distance" && userLocation) {
        const da =
          a.lat && a.lng
            ? distanceMiles(userLocation.lat, userLocation.lng, a.lat, a.lng)
            : Infinity;
        const db =
          b.lat && b.lng
            ? distanceMiles(userLocation.lat, userLocation.lng, b.lat, b.lng)
            : Infinity;
        return da - db;
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
            {userLocation && <option value="distance">Nearest to Me</option>}
          </select>
        </label>
        {!userLocation && (
          <button onClick={onRequestLocation} style={{ marginLeft: 8 }}>
            Find Near Me
          </button>
        )}
      </div>
      {filtered.map((b) => (
        <BathroomCard
          key={b.id}
          bathroom={b}
          reviews={reviews}
          photos={photos}
          userLocation={userLocation}
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

const ReviewList = ({
  reviews,
  photos,
  votes,
  currentUserId,
  onVote,
}) => {
  if (reviews.length === 0) return <p>No reviews yet.</p>;

  return (
    <ul style={{ paddingLeft: 16 }}>
      {reviews.map((r) => {
        const reviewPhotos = photos.filter((p) => p.reviewId === r.id);
        const score = calculateVoteScore(r.id, votes);
        const userVote = getUserVote(r.id, currentUserId, votes);

        return (
          <li key={r.id} style={{ marginBottom: 16, listStyle: "none" }}>
            <p>Overall: {r.overallRating}</p>
            <p>Cleanliness: {r.cleanlinessRating ?? "N/A"}</p>
            <p>Accessibility: {r.accessibilityRating ?? "N/A"}</p>
            <p>{r.text}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => onVote(r.id, 1)}
                style={{
                  color: userVote?.value === 1 ? "blue" : "inherit",
                }}
              >
                👍 Upvote
              </button>
              <button
                type="button"
                onClick={() => onVote(r.id, -1)}
                style={{
                  color: userVote?.value === -1 ? "red" : "inherit",
                }}
              >
                👎 Downvote
              </button>
              <span>
                Helpful: {score >= 0 ? `+${score}` : score}
              </span>
            </div>
            {reviewPhotos.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
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

const BathroomDetail = ({
  bathroom,
  reviews,
  photos,
  votes,
  userLocation,
  currentUserId,
  onVote,
}) => {
  const bathroomReviews = reviews.filter((r) => r.bathroomId === bathroom.id);
  const bathroomPhotos = photos.filter((p) => p.bathroomId === bathroom.id);

  const distance =
    userLocation && bathroom.lat && bathroom.lng
      ? distanceMiles(
          userLocation.lat,
          userLocation.lng,
          bathroom.lat,
          bathroom.lng
        ).toFixed(1)
      : null;

  return (
    <div>
      <h2>{bathroom.name}</h2>
      <p>Address: {bathroom.address}</p>
      <p>Type: {bathroom.type}</p>
      <p>Description: {bathroom.description}</p>
      {distance && <p>{distance} miles away</p>}

      {bathroomPhotos.length > 0 && (
        <div
          style={{
            margin: "10px 0",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {bathroomPhotos.map((p) => (
            <img
              key={p.id}
              src={p.dataUrl}
              alt="Bathroom"
              style={{
                width: 100,
                height: 100,
                objectFit: "cover",
                borderRadius: 4,
              }}
            />
          ))}
        </div>
      )}

      <MiniMap lat={bathroom.lat} lng={bathroom.lng} />

      <h3 style={{ marginTop: 16 }}>Reviews</h3>
      <ReviewList
        reviews={bathroomReviews}
        photos={photos}
        votes={votes}
        currentUserId={currentUserId}
        onVote={onVote}
      />
    </div>
  );
};

const AddBathroomForm = ({ onAdd, userLocation, onUseLocation }) => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("public");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    if (userLocation) {
      setLat(userLocation.lat.toFixed(6));
      setLng(userLocation.lng.toFixed(6));
    }
  }, [userLocation]);

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
        lat: lat ? Number(lat) : null,
        lng: lng ? Number(lng) : null,
      },
      photos
    );
    setName("");
    setAddress("");
    setType("public");
    setDescription("");
    setPhotos([]);
    setLat("");
    setLng("");
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
      <div style={{ marginBottom: 8 }}>
        <label>
          Lat:{" "}
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            style={{ width: 120 }}
          />
        </label>{" "}
        <label>
          Lng:{" "}
          <input
            type="text"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            style={{ width: 120 }}
          />
        </label>{" "}
        <button type="button" onClick={onUseLocation}>
          Use my location
        </button>
      </div>
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

const getOrCreateCurrentUserId = () => {
  let id = localStorage.getItem("currentUserId");
  if (!id) {
    id = "user_" + generateId();
    localStorage.setItem("currentUserId", id);
  }
  return id;
};

const App = () => {
  const [state, setState] = useState(loadState());
  const [view, setView] = useState("list");
  const [selectedBathroom, setSelectedBathroom] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [currentUserId] = useState(getOrCreateCurrentUserId);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const refresh = () => setState(loadState());

  const handleRequestLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setLocationError(error.message || "Unable to retrieve your location.");
      }
    );
  };

  const handleUseLocationInForm = () => {
    if (!userLocation) {
      handleRequestLocation();
    }
  };

  const handleAddBathroom = (bathroom, photos) => {
    addBathroom(bathroom, photos);
    refresh();
    setView("list");
  };

  const handleReviewAdded = () => {
    refresh();
  };

  const handleVote = (reviewId, value) => {
    addVote(reviewId, currentUserId, value);
    refresh();
  };

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <h1>Flush 🚽 — Yelp for Bathrooms</h1>
      <nav style={{ marginBottom: 16 }}>
        <button onClick={() => setView("list")}>List</button>{" "}
        <button onClick={() => setView("add")}>Add Bathroom</button>{" "}
        <button onClick={() => setView("map")}>Map</button>
      </nav>

      {locationError && (
        <p style={{ color: "red" }}>Location Error: {locationError}</p>
      )}

      {view === "list" && (
        <BathroomList
          bathrooms={state.bathrooms}
          reviews={state.reviews}
          photos={state.photos}
          userLocation={userLocation}
          onRequestLocation={handleRequestLocation}
          onSelect={(bathroom) => {
            setSelectedBathroom(bathroom);
            setView("detail");
          }}
        />
      )}

      {view === "add" && (
        <AddBathroomForm
          onAdd={handleAddBathroom}
          userLocation={userLocation}
          onUseLocation={handleUseLocationInForm}
        />
      )}

      {view === "map" && (
        <div>
          {!userLocation && (
            <button
              onClick={handleRequestLocation}
              style={{ marginBottom: 8 }}
            >
              Use my location
            </button>
          )}
          <MapView
            bathrooms={state.bathrooms}
            userLocation={userLocation}
            onSelect={(bathroom) => {
              setSelectedBathroom(bathroom);
              setView("detail");
            }}
          />
        </div>
      )}

      {view === "detail" && selectedBathroom && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setView("list")}>← Back to list</button>
          <BathroomDetail
            bathroom={selectedBathroom}
            reviews={state.reviews}
            photos={state.photos}
            votes={state.votes}
            userLocation={userLocation}
            currentUserId={currentUserId}
            onVote={handleVote}
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
