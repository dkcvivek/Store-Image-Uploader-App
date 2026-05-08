import React, { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [images, setImages] = useState([]);
  const [currentImages, setCurrentImages] = useState([]);
  const [currentFiles, setCurrentFiles] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [editingTexts, setEditingTexts] = useState({});

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) return;

    setCurrentFiles(imageFiles);

    const imagePromises = imageFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target.result);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then((imageDataUrls) => {
      setCurrentImages(imageDataUrls);
    });

    // Reset input
    setShowPicker(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (currentFiles.length === 0) return;

    try {
      const formData = new FormData();

      currentFiles.forEach((file) => {
        formData.append("images", file);
      });

      const uploadRes = await fetch(
        "https://dkc-photos.ai.dkcexportstna.in/api/v1/create-image/",
        {
          method: "POST",
          body: formData,
        },
      );

      const imageIds = await uploadRes.json();

      console.log("Uploaded IDs:", imageIds);

      showToast(`${imageIds.length} image(s) saved!`);

      // OPTIONAL: immediately refresh gallery
      fetchImages();

      handleNextPicture();
    } catch (err) {
      console.error("Save error:", err);
      showToast("Failed to save");
    }
  };

  const handleNextPicture = () => {
    setCurrentImages([]);
    setCurrentFiles([]);
  };

  const removeImage = (index) => {
    setCurrentImages((prev) => prev.filter((_, i) => i !== index));
    setCurrentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  };

  const fetchImages = async () => {
    try {
      const res = await fetch(
        "https://dkc-photos.ai.dkcexportstna.in/api/v1/list-image/",
      );
      const data = await res.json();

      // DRF pagination format
      const formatted = data.results.map((item) => ({
        id: item.image_id,
        url: item.image,
        caption: item.text,
      }));

      setImages(formatted);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleTextChange = (id, value) => {
    setEditingTexts((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleUpdateText = async (id) => {
    const text = editingTexts[id];

    if (!text) {
      showToast("Text cannot be empty");
      return;
    }

    try {
      const res = await fetch(
        `https://dkc-photos.ai.dkcexportstna.in/api/v1/${id}/update-image-text/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        },
      );

      if (!res.ok) throw new Error("Failed text update");

      showToast("Text updated!");

      fetchImages();

      setEditingTexts((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (err) {
      console.error(err);
      showToast("Update failed");
    }
  };

  const handleCopyImage = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("Fetch failed");
      }

      const blob = await response.blob();

      if (!navigator.clipboard || !navigator.clipboard.write) {
        throw new Error("Clipboard API not supported");
      }

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      showToast("Image copied!");
    } catch (err) {
      console.error("Copy error:", err);
      showToast("Copy failed - please try manually");
    }
  };

  const handleCopyImageURL = async (imageUrl) => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API not supported");
      }

      navigator.clipboard.writeText(imageUrl);
      showToast("Image URL copied!");
    } catch (err) {
      console.error("Copy error:", err);
      showToast("Copy failed - please try manually");
    }
  };

  const handleCopyText = async (caption) => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API not supported");
      }

      navigator.clipboard.writeText(caption);
      showToast("Caption copied!");
    } catch (err) {
      console.error("Copy error:", err);
      showToast("Copy failed - please try manually");
    }
  };


  const handleDownloadImage = async (imageUrl, filename = "image") => {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error("Fetch failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.jpg`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      showToast("Download started!");
    } catch (err) {
      console.error("Download error:", err);
      showToast("Download failed - please right-click and save");
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  if (isMobile) {
    return (
      <div className="app mobile-view">
        <div className="polaroid-container">
          <div className="polaroid-frame">
            <h1 className="app-title">Snapshot</h1>

            {currentImages.length === 0 ? (
              <div className="upload-zone" onClick={() => setShowPicker(true)}>
                <p className="upload-text">Tap to capture moment(s)</p>

                {/* Camera input - single photo */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />

                {/* Gallery input - multiple photos */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
              </div>
            ) : (
              <div className="preview-container">
                <div className="images-preview-grid">
                  {currentImages.map((imgSrc, index) => (
                    <div key={index} className="image-preview-item">
                      <img
                        src={imgSrc}
                        alt={`Preview ${index + 1}`}
                        className="preview-image"
                      />
                      <button
                        className="remove-image-btn"
                        onClick={() => removeImage(index)}
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <p className="image-count">
                  {currentImages.length} image
                  {currentImages.length !== 1 ? "s" : ""} selected
                </p>

                <div className="action-buttons">
                  <button onClick={handleSave} className="btn btn-primary">
                    Save {currentImages.length > 1 ? "All" : ""}
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentImages.length > 0 && (
            <div className="footer-nav">
              <button onClick={handleNextPicture} className="next-picture-btn">
                Next Picture →
              </button>
            </div>
          )}
        </div>

        {/* ─── Picker Modal ───────────────── */}
        {showPicker && (
          <div className="picker-overlay">
            <div className="picker-box">
              <button
                className="picker-btn"
                onClick={() => {
                  setShowPicker(false);
                  cameraInputRef.current?.click();
                }}
              >
                📸 Click Photo
              </button>

              <button
                className="picker-btn"
                onClick={() => {
                  setShowPicker(false);
                  galleryInputRef.current?.click();
                }}
              >
                🖼 Choose from Gallery
              </button>

              <button
                className="picker-cancel"
                onClick={() => setShowPicker(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app desktop-view">
      <h1 className="app-title">Snapshot Gallery</h1>

      {images.length === 0 ? (
        <p>No photos yet</p>
      ) : (
        <div className="image-grid">
          {images.map((image) => (
            <div key={image.id} className="grid-card">
              <div className="desktop-img-holder">
                <img
                  src={image.url}
                  alt=""
                  onClick={() => setSelectedImage(image)}
                  style={{ cursor: "pointer" }}
                />
              </div>

              <div className="input-btn-holder">
                <input
                  type="text"
                  placeholder="Enter caption..."
                  value={
                    editingTexts[image.id] !== undefined
                      ? editingTexts[image.id]
                      : image.caption || ""
                  }
                  onChange={(e) => handleTextChange(image.id, e.target.value)}
                  className="caption-input"
                />

                <button
                  className="btn btn-primary"
                  onClick={() => handleUpdateText(image.id)}
                >
                  Save
                </button>
              </div>

              <div className="secondary-btn-holder">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCopyImageURL(image.url)}
                >
                  Copy Img Url
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => handleCopyImage(image.url)}
                >
                  Copy Image
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() => handleCopyText(image.caption)}
                >
                  Copy Text
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    handleDownloadImage(
                      image.url,
                      image.caption || `image-${image.id}`,
                    )
                  }
                >
                  Download Img
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage.url} alt="" className="modal-image" />

            {selectedImage.caption && (
              <p className="modal-caption">{selectedImage.caption}</p>
            )}

            <button
              className="modal-close"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
