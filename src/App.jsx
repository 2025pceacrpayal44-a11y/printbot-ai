import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import "./App.css";

const MATERIALS = {
PLA: { rate: 0.8, nozzle: "190–220°C", bed: "50–60°C" },
PETG: { rate: 1.0, nozzle: "230–250°C", bed: "70–85°C" },
ABS: { rate: 1.1, nozzle: "240–260°C", bed: "90–110°C" },
TPU: { rate: 1.5, nozzle: "210–240°C", bed: "40–60°C" },
};

function ModelViewer({ file }) {
const containerRef = useRef(null);
const [viewerError, setViewerError] = useState("");

useEffect(() => {
const container = containerRef.current;


if (!container || !file) return;

let renderer;
let geometry;
let modelMaterial;
let animationId;
let resizeObserver;
let disposed = false;
let objectUrl;

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#111925");

  const camera = new THREE.PerspectiveCamera(
    45,
    1,
    0.1,
    100000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(
    container.clientWidth || 400,
    container.clientHeight || 260
  );

  container.replaceChildren(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.8));

  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(100, 150, 100);
  scene.add(light);

  const loader = new STLLoader();
  objectUrl = URL.createObjectURL(file);

  loader.load(
    objectUrl,
    (loadedGeometry) => {
      if (disposed) {
        loadedGeometry.dispose();
        return;
      }

      geometry = loadedGeometry;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      const bounds = geometry.boundingBox;
      const size = new THREE.Vector3();
      bounds.getSize(size);
      geometry.center();

      const maxSize = Math.max(size.x, size.y, size.z, 1);

      camera.position.set(
        maxSize * 1.8,
        maxSize * 1.5,
        maxSize * 2.2
      );
      camera.near = Math.max(maxSize / 10000, 0.001);
      camera.far = maxSize * 100;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      modelMaterial = new THREE.MeshStandardMaterial({
        color: "#b7ed70",
        metalness: 0.1,
        roughness: 0.55,
      });

      const model = new THREE.Mesh(geometry, modelMaterial);
      scene.add(model);

      const grid = new THREE.GridHelper(
        maxSize * 2,
        10,
        "#52664b",
        "#293545"
      );
      grid.position.y = -size.y / 2;
      scene.add(grid);

      setViewerError("");
    },
    undefined,
    () => {
      if (!disposed) {
        setViewerError("Could not load this STL file.");
      }
    }
  );

  resizeObserver = new ResizeObserver(() => {
    if (disposed || !renderer) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 260;

    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

  resizeObserver.observe(container);

  function animate() {
    if (disposed) return;
    animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  animate();
} catch {
  setViewerError(
    "3D preview is unavailable. Check your browser's WebGL support."
  );
}

return () => {
  disposed = true;
  cancelAnimationFrame(animationId);
  resizeObserver?.disconnect();

  geometry?.dispose();
  modelMaterial?.dispose();
  renderer?.dispose();

  if (objectUrl) URL.revokeObjectURL(objectUrl);

  container.replaceChildren();
};


}, [file]);

if (!file) {
return ( <div className="viewer-placeholder"> <div className="viewer-cube">◇</div> <h3>Your model appears here</h3> <p>Upload an STL file to preview it in 3D.</p> </div>
);
}

return ( <div> <div className="viewer-canvas" ref={containerRef} />
{viewerError && <p className="error-message">{viewerError}</p>} </div>
);
}

export default function App() {
const [material, setMaterial] = useState("PLA");
const [weight, setWeight] = useState(100);
const [hours, setHours] = useState(3);
const [budget, setBudget] = useState(150);
const [quantity, setQuantity] = useState(1);
const [infill, setInfill] = useState(20);

const [file, setFile] = useState(null);
const [modelInfo, setModelInfo] = useState(null);
const [fileError, setFileError] = useState("");

const [question, setQuestion] = useState("");
const [answer, setAnswer] = useState("");

const rates = MATERIALS[material];
const materialCost = weight * rates.rate;
const electricityCost = hours * 0.8;
const machineCost = hours * 10;

const totalCost =
(materialCost + electricityCost + machineCost) * quantity;

function handleFileChange(event) {
const selectedFile = event.target.files?.[0];


if (!selectedFile) return;

if (!selectedFile.name.toLowerCase().endsWith(".stl")) {
  setFileError("Please select an STL file.");
  event.target.value = "";
  return;
}

if (selectedFile.size > 25 * 1024 * 1024) {
  setFileError("File must be smaller than 25 MB.");
  event.target.value = "";
  return;
}

setFileError("");
setFile(selectedFile);
setModelInfo(null);
setAnswer("");


}

function analyzeModel() {
if (!file) {
setFileError("Please upload an STL file first.");
return;
}


setFileError("");

const reader = new FileReader();

reader.onload = () => {
  try {
    const loader = new STLLoader();
    const geometry = loader.parse(reader.result);

    geometry.computeBoundingBox();

    const bounds = geometry.boundingBox;
    const position = geometry.getAttribute("position");

    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.y - bounds.min.y;
    const height = bounds.max.z - bounds.min.z;

    let signedVolume = 0;

    for (let i = 0; i < position.count; i += 3) {
      const ax = position.getX(i);
      const ay = position.getY(i);
      const az = position.getZ(i);

      const bx = position.getX(i + 1);
      const by = position.getY(i + 1);
      const bz = position.getZ(i + 1);

      const cx = position.getX(i + 2);
      const cy = position.getY(i + 2);
      const cz = position.getZ(i + 2);

      signedVolume += (
        ax * (by * cz - bz * cy) +
        ay * (bz * cx - bx * cz) +
        az * (bx * cy - by * cx)
      ) / 6;
    }

    setModelInfo({
      width,
      depth,
      height,
      volume: Math.abs(signedVolume) / 1000,
      triangles: Math.floor(position.count / 3),
      fileSize: file.size / 1024,
    });

    geometry.dispose();
  } catch {
    setFileError(
      "Analysis failed. Export the model as a valid STL and try again."
    );
  }
};

reader.onerror = () => {
  setFileError("The browser could not read the selected file.");
};

reader.readAsArrayBuffer(file);


}

function getAnswer(text) {
const input = text.toLowerCase();


if (input.includes("stringing")) {
  return "STRINGING: Check filament moisture, reduce nozzle temperature gradually within the filament manufacturer's recommended range, and calibrate retraction. Test one adjustment at a time.";
}

if (input.includes("warping") || input.includes("adhesion")) {
  return "BED ADHESION: Clean the build plate, verify first-layer height, and check bed temperature. A brim may help when suitable. ABS often benefits from an enclosure.";
}

if (input.includes("cost") || input.includes("budget")) {
  return (
    "Your estimated total is ₹" +
    totalCost.toFixed(2) +
    ". " +
    (totalCost > budget
      ? "The estimate exceeds your budget. Consider reducing material usage only if the design and strength requirements allow it."
      : "The estimate is within your budget.")
  );
}

if (input.includes("pla")) {
  return (
    "PLA guidance: Start with the filament manufacturer's settings. " +
    "Typical nozzle range: " +
    MATERIALS.PLA.nozzle +
    ". Typical bed range: " +
    MATERIALS.PLA.bed +
    ". Confirm compatibility with your printer."
  );
}

if (input.includes("petg")) {
  return (
    "PETG guidance: Typical nozzle range: " +
    MATERIALS.PETG.nozzle +
    ". Typical bed range: " +
    MATERIALS.PETG.bed +
    ". Check the filament manufacturer's recommendations."
  );
}

if (input.includes("support")) {
  return "SUPPORTS: Review overhangs in your slicer, choose a suitable support style, and preview the sliced layers before printing.";
}

return "GENERAL TROUBLESHOOTING: Check filament condition, nozzle temperature, first-layer adhesion, bed leveling and slicer settings. Change one setting at a time. These are general recommendations, not machine-specific diagnostics.";


}

function askAssistant(text = question) {
if (!text.trim()) return;


setQuestion(text);
setAnswer(getAnswer(text));


}

function downloadReport() {
const report = [
"PRINTBOT AI — PRINT ESTIMATE",
"============================",
"STL file: " + (file?.name || "Not selected"),
"Material: " + material,
"Filament usage: " + weight + " g",
"Infill setting: " + infill + "%",
"Duration: " + hours + " hours",
"Quantity: " + quantity,
"Material cost: ₹" + materialCost.toFixed(2),
"Electricity cost: ₹" + electricityCost.toFixed(2),
"Machine cost: ₹" + machineCost.toFixed(2),
"Estimated total: ₹" + totalCost.toFixed(2),
"Budget: ₹" + budget,
"",
"Model analysis:",
modelInfo
? JSON.stringify(modelInfo, null, 2)
: "No model analyzed",
"",
"These are illustrative estimates, not slicer-generated results.",
].join("\n");


const blob = new Blob([report], {
  type: "text/plain;charset=utf-8",
});

const url = URL.createObjectURL(blob);
const link = document.createElement("a");

link.href = url;
link.download = "printbot-report.txt";
link.click();

setTimeout(() => URL.revokeObjectURL(url), 1000);


}

return ( <div className="app-shell"> <aside className="sidebar"> <a className="brand" href="#overview"> <div className="brand-icon">P</div> <div> <h2>PrintBot <span>AI</span></h2> <small>3D PRINT COPILOT</small> </div> </a>


    <p className="nav-label">WORKSPACE</p>
    <a className="nav-item active" href="#overview">◈ Overview</a>
    <a className="nav-item" href="#analyzer">▧ Model Analyzer</a>
    <a className="nav-item" href="#cost">₹ Cost Studio</a>
    <a className="nav-item" href="#assistant">✳ Print Assistant</a>

    <div className="sidebar-bottom">
      <div><span className="status-dot" />Workspace ready</div>
      <p>Built for makers, students and creators.</p>
      <small>HACKATHON PROTOTYPE</small>
    </div>
  </aside>

  <main className="main-content">
    <header className="topbar">
      <div>
        <p className="eyebrow">YOUR INTELLIGENT PRINT WORKSPACE</p>
        <h1>Print smarter. Build better.</h1>
      </div>
      <div className="profile-badge">PB</div>
    </header>

    <section className="hero" id="overview">
      <div className="hero-copy">
        <span className="pill">✦ SMART PRINTING WORKSPACE</span>
        <h2>From digital idea<br />to <span>physical reality.</span></h2>
        <p>
          Preview your models, estimate printing expenses and get
          practical recommendations before your next print.
        </p>
        <a href="#analyzer" className="primary-button">
          Start a new print ↗
        </a>
      </div>

      <div className="hero-art">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="cube">
          <div className="cube-top" />
          <div className="cube-left" />
          <div className="cube-right" />
        </div>
        <div className="floating-tag">LAYER BY LAYER ✦</div>
      </div>
    </section>

    <section className="stats-grid">
      <article className="stat-card">
        <span>◈</span>
        <p>Selected material</p>
        <h3>{material}</h3>
        <small>Material guidance available</small>
      </article>

      <article className="stat-card">
        <span>₹</span>
        <p>Estimated print cost</p>
        <h3>₹{totalCost.toFixed(2)}</h3>
        <small>Illustrative estimate</small>
      </article>

      <article className="stat-card">
        <span>◷</span>
        <p>Print duration</p>
        <h3>{hours} hours</h3>
        <small>Manually selected duration</small>
      </article>
    </section>

    <section className="work-grid">
      <article className="panel" id="analyzer">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">01 / MODEL WORKSPACE</p>
            <h2>3D Model Analyzer</h2>
          </div>
          <span className="icon-box">◇</span>
        </div>

        <label className="upload-zone">
          <div className="upload-symbol">↑</div>
          <h3>{file ? file.name : "Upload your 3D model"}</h3>
          <p>Choose an STL file up to 25 MB.</p>
          <span className="secondary-button">Browse STL files</span>
          <input type="file" accept=".stl" onChange={handleFileChange} />
        </label>

        {fileError && <p className="error-message">{fileError}</p>}

        <div className="viewer-container">
          <ModelViewer file={file} />
        </div>

        <button className="primary-button full-button" onClick={analyzeModel}>
          Analyze STL model ↗
        </button>

        {modelInfo && (
          <div className="model-results">
            <h3>Analysis results</h3>
            <div className="result-grid">
              <div><span>Width</span><strong>{modelInfo.width.toFixed(2)} mm</strong></div>
              <div><span>Depth</span><strong>{modelInfo.depth.toFixed(2)} mm</strong></div>
              <div><span>Height</span><strong>{modelInfo.height.toFixed(2)} mm</strong></div>
              <div><span>Triangles</span><strong>{modelInfo.triangles.toLocaleString()}</strong></div>
              <div><span>Mesh volume</span><strong>{modelInfo.volume.toFixed(2)} cm³</strong></div>
              <div><span>File size</span><strong>{modelInfo.fileSize.toFixed(1)} KB</strong></div>
            </div>
            <p className="hint">
              Volume accuracy depends on mesh closure and orientation.
              Results are not generated by a slicer.
            </p>
          </div>
        )}
      </article>

      <article className="panel" id="cost">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">02 / ESTIMATION ENGINE</p>
            <h2>Cost Studio</h2>
          </div>
          <span className="icon-box">₹</span>
        </div>

        <label className="field-label">Filament material</label>
        <select value={material} onChange={e => setMaterial(e.target.value)}>
          <option value="PLA">PLA — ₹0.80/g</option>
          <option value="PETG">PETG — ₹1.00/g</option>
          <option value="ABS">ABS — ₹1.10/g</option>
          <option value="TPU">TPU — ₹1.50/g</option>
        </select>

        <div className="slider-heading">
          <label className="field-label">Filament usage</label>
          <strong>{weight} g</strong>
        </div>
        <input type="range" min="10" max="500" value={weight}
          onChange={e => setWeight(Number(e.target.value))} />

        <div className="slider-heading">
          <label className="field-label">Infill setting</label>
          <strong>{infill}%</strong>
        </div>
        <input type="range" min="0" max="100" value={infill}
          onChange={e => setInfill(Number(e.target.value))} />

        <div className="slider-heading">
          <label className="field-label">Printing duration</label>
          <strong>{hours} hours</strong>
        </div>
        <input type="range" min="1" max="48" value={hours}
          onChange={e => setHours(Number(e.target.value))} />

        <label className="field-label">Print quantity</label>
        <input className="number-input" type="number" min="1" max="100"
          value={quantity}
          onChange={e => setQuantity(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />

        <label className="field-label">Your budget (₹)</label>
        <input className="number-input" type="number" min="0"
          value={budget}
          onChange={e => setBudget(Math.max(0, Number(e.target.value) || 0))} />

        <div className="cost-breakdown">
          <div><span>Material</span><strong>₹{materialCost.toFixed(2)}</strong></div>
          <div><span>Electricity</span><strong>₹{electricityCost.toFixed(2)}</strong></div>
          <div><span>Machine usage</span><strong>₹{machineCost.toFixed(2)}</strong></div>
          <div className="total-row"><span>Total estimate</span><strong>₹{totalCost.toFixed(2)}</strong></div>
        </div>

        <p className={totalCost > budget ? "budget-warning" : "budget-ok"}>
          {totalCost > budget
            ? `₹${(totalCost - budget).toFixed(2)} above your budget`
            : `Within budget · ₹${(budget - totalCost).toFixed(2)} remaining`}
        </p>

        <p className="hint">
          Rates are illustrative. Infill is displayed for reference and
          does not automatically recalculate filament usage.
        </p>

        <button className="primary-button full-button" onClick={downloadReport}>
          Export print report ↓
        </button>
      </article>
    </section>

    <section className="panel assistant-panel" id="assistant">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">03 / TROUBLESHOOTING</p>
          <h2>Print Assistant</h2>
        </div>
        <span className="assistant-status">● Rule-based demo</span>
      </div>

      <p className="assistant-description">
        Get quick guidance for common 3D printing problems.
        This version does not connect to an external AI model.
      </p>

      <div className="suggestions">
        {[
          "How do I fix stringing?",
          "My print is warping",
          "PLA printing tips",
          "PETG settings",
          "How can I reduce cost?",
        ].map(item => (
          <button key={item} onClick={() => askAssistant(item)}>
            {item}
          </button>
        ))}
      </div>

      <div className="chat-input">
        <input value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && askAssistant()}
          placeholder="Ask about stringing, warping, PLA..." />
        <button onClick={() => askAssistant()}>Ask PrintBot ↗</button>
      </div>

      {answer && (
        <div className="answer-box">
          <strong>PrintBot guidance</strong>
          <p>{answer}</p>
        </div>
      )}
    </section>

    <footer>
      <span>PRINTBOT AI · HACKATHON PROTOTYPE</span>
      <span>Estimates are illustrative, not slicer-verified.</span>
    </footer>
  </main>
</div>


);
}
