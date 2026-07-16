import { INITIAL_PROJECTS } from "../data/initialProjects";
import { Project } from "../types";

// Key definitions for localStorage
const LS_KEYS = {
  PROJECTS: "shailora-projects-db",
  SOUNDS: "shailora-sounds-db",
  CONFIG: "shailora-config-db",
  PROBED_OFFLINE: "shailora-api-offline-flag"
};

const DEFAULT_CONTACT = {
  phone: "+91 98765 43210",
  email: "contact@shailora.com",
  instagram: "shailoradesign",
  linkedin: "shailora-design-studio",
  address: "Shailora Design Studio, Atelier 4, New Delhi, India"
};

const DEFAULT_ABOUT = {
  backgroundColor: "#18181b",
  textColor: "#f4f4f5",
  blocks: [
    {
      id: "about-block-1",
      type: "text",
      content: "At SHAILORA, we conceptualize and build silent, monumental contemporary architecture. Our work is a continuous exploration of raw concrete, geometric light pockets, and tectonic scale. Under the design direction of leading spatial researchers, our studio has delivered landmarks that challenge the traditional dichotomy of landscape and enclosure."
    },
    {
      id: "about-block-2",
      type: "image",
      content: "/uploads/regenerated_image_1784111618009.png",
      aspect: "16:9"
    }
  ]
};

const DEFAULT_NEWSLETTER = {
  backgroundColor: "#09090b",
  textColor: "#f4f4f5",
  blocks: [
    {
      id: "news-block-1",
      type: "text",
      content: "Join our seasonal dispatch. We share high-fidelity architectural sketches, blueprints, essays on materials, and project construction journals directly from our active ateliers."
    }
  ]
};

const DEFAULT_SOUNDS = [
  {
    id: "procedural",
    name: "Atelier Procedural Synth (Default)",
    url: "procedural",
    active: true
  }
];

const DEFAULT_CONFIG = {
  passcode: "shailora",
  ...DEFAULT_CONTACT,
  logoType: "default",
  logoUrl: "",
  logoWidth: 60,
  logoHeight: 50,
  hideText: false,
  aboutSection: DEFAULT_ABOUT,
  newsletterSection: DEFAULT_NEWSLETTER
};

// Initialize localStorage with initial data if empty
function initializeLocalStorage() {
  if (!localStorage.getItem(LS_KEYS.PROJECTS)) {
    localStorage.setItem(LS_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
  }
  if (!localStorage.getItem(LS_KEYS.SOUNDS)) {
    localStorage.setItem(LS_KEYS.SOUNDS, JSON.stringify(DEFAULT_SOUNDS));
  }
  if (!localStorage.getItem(LS_KEYS.CONFIG)) {
    localStorage.setItem(LS_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
  }
}

// Global flag to track whether to run mock mode
let useMockMode = false;

// Probe function to test if Express is online and responding with JSON
async function probeApi() {
  try {
    const res = await originalFetch("/api/projects", { method: "GET" });
    const contentType = res.headers.get("content-type") || "";
    // If it returns HTML (like Netlify's 404/SPA redirection) or fails to fetch, use Mock
    if (res.ok && contentType.includes("application/json")) {
      useMockMode = false;
      console.log("SHAILORA: Native Express backend detected. Running in Full-Stack Mode.");
    } else {
      useMockMode = true;
      console.warn("SHAILORA: Express backend returned non-JSON. Falling back to Netlify Client-Side Database Mode.");
      initializeLocalStorage();
    }
  } catch (err) {
    useMockMode = true;
    console.warn("SHAILORA: Express backend is unreachable. Falling back to Netlify Client-Side Database Mode.");
    initializeLocalStorage();
  }
}

// Keep reference to the real fetch function
const originalFetch = window.fetch;

// Intercept all fetch requests globally
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
  
  // If request is not an API request, or we already probed and Express is online, use original fetch
  if (!urlString.includes("/api/")) {
    return originalFetch(input, init);
  }

  // If this is the very first API request, do a fast synchronous probe check
  if (typeof useMockMode === "undefined" || useMockMode === null || (!useMockMode && !localStorage.getItem(LS_KEYS.PROBED_OFFLINE))) {
    // Check if we are running on a static host
    const isNetlify = window.location.hostname.includes("netlify") || 
                      window.location.hostname.includes("vercel") || 
                      window.location.hostname.includes("github.io") ||
                      window.location.hostname.includes("localhost") && !urlString.includes(":3000") && window.location.port !== "3000";
    
    if (isNetlify) {
      useMockMode = true;
      localStorage.setItem(LS_KEYS.PROBED_OFFLINE, "true");
      initializeLocalStorage();
    } else {
      try {
        await probeApi();
      } catch (e) {
        useMockMode = true;
        initializeLocalStorage();
      }
    }
  }

  // If we decided the Express API is online, forward to real fetch
  if (!useMockMode) {
    try {
      return await originalFetch(input, init);
    } catch (err) {
      console.warn("Express backend connection dropped. Activating Netlify Client-Side Database Mode.");
      useMockMode = true;
      initializeLocalStorage();
    }
  }

  // =========================================================================
  // CLIENT-SIDE MOCK DATABASE ENGINE
  // =========================================================================
  const url = new URL(urlString, window.location.origin);
  const path = url.pathname;
  const method = init?.method?.toUpperCase() || "GET";
  const body = init?.body ? JSON.parse(init.body as string) : null;

  console.log(`[Netlify DB Mock] Intercepted API Request: ${method} ${path}`, body);

  const getProjects = (): Project[] => JSON.parse(localStorage.getItem(LS_KEYS.PROJECTS) || "[]");
  const saveProjects = (p: Project[]) => localStorage.setItem(LS_KEYS.PROJECTS, JSON.stringify(p));

  const getSounds = (): any[] => JSON.parse(localStorage.getItem(LS_KEYS.SOUNDS) || "[]");
  const saveSounds = (s: any[]) => localStorage.setItem(LS_KEYS.SOUNDS, JSON.stringify(s));

  const getConfig = (): any => JSON.parse(localStorage.getItem(LS_KEYS.CONFIG) || "{}");
  const saveConfig = (c: any) => localStorage.setItem(LS_KEYS.CONFIG, JSON.stringify(c));

  // 1. Projects endpoint: GET /api/projects
  if (path === "/api/projects" && method === "GET") {
    const list = getProjects();
    const sorted = [...list].sort((a, b) => (a.homepageOrder || 0) - (b.homepageOrder || 0));
    return createMockResponse(sorted);
  }

  // 2. Project single endpoint: GET /api/projects/:id
  if (path.startsWith("/api/projects/") && !path.endsWith("/ai-critique") && method === "GET") {
    const id = path.replace("/api/projects/", "");
    const list = getProjects();
    const found = list.find((p) => p.id === id);
    if (found) {
      return createMockResponse(found);
    }
    return createMockResponse({ error: "Project not found" }, 404);
  }

  // 3. Create project: POST /api/projects
  if (path === "/api/projects" && method === "POST") {
    const list = getProjects();
    const newProject: Project = body;
    if (!newProject.id) {
      newProject.id = newProject.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    // Ensure unique id
    let finalId = newProject.id;
    let counter = 1;
    while (list.some((p) => p.id === finalId)) {
      finalId = `${newProject.id}-${counter}`;
      counter++;
    }
    newProject.id = finalId;
    list.push(newProject);
    saveProjects(list);
    return createMockResponse(newProject, 201);
  }

  // 4. Update project: PUT /api/projects/:id
  if (path.startsWith("/api/projects/") && !path.endsWith("/ai-critique") && method === "PUT") {
    const id = path.replace("/api/projects/", "");
    const list = getProjects();
    const index = list.findIndex((p) => p.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...body, id };
      saveProjects(list);
      return createMockResponse(list[index]);
    }
    return createMockResponse({ error: "Project not found" }, 404);
  }

  // 5. Delete project: DELETE /api/projects/:id
  if (path.startsWith("/api/projects/") && !path.endsWith("/ai-critique") && method === "DELETE") {
    const id = path.replace("/api/projects/", "");
    const list = getProjects();
    const filtered = list.filter((p) => p.id !== id);
    if (list.length !== filtered.length) {
      saveProjects(filtered);
      return createMockResponse({ success: true, message: "Project deleted" });
    }
    return createMockResponse({ error: "Project not found" }, 404);
  }

  // 6. Contact Us: GET /api/contact
  if (path === "/api/contact" && method === "GET") {
    const config = getConfig();
    return createMockResponse({
      phone: config.phone !== undefined ? config.phone : DEFAULT_CONTACT.phone,
      email: config.email !== undefined ? config.email : DEFAULT_CONTACT.email,
      instagram: config.instagram !== undefined ? config.instagram : DEFAULT_CONTACT.instagram,
      linkedin: config.linkedin !== undefined ? config.linkedin : DEFAULT_CONTACT.linkedin,
      address: config.address !== undefined ? config.address : DEFAULT_CONTACT.address
    });
  }

  // 7. Save Contact: POST /api/admin/contact
  if (path === "/api/admin/contact" && method === "POST") {
    const config = getConfig();
    const updated = { ...config, ...body };
    saveConfig(updated);
    return createMockResponse({ success: true, message: "Contact details updated on client-side ledger." });
  }

  // 8. Logo config: GET /api/logo
  if (path === "/api/logo" && method === "GET") {
    const config = getConfig();
    return createMockResponse({
      logoType: config.logoType !== undefined ? config.logoType : "default",
      logoUrl: config.logoUrl !== undefined ? config.logoUrl : "",
      logoWidth: config.logoWidth !== undefined ? Number(config.logoWidth) : 60,
      logoHeight: config.logoHeight !== undefined ? Number(config.logoHeight) : 50,
      hideText: config.hideText !== undefined ? Boolean(config.hideText) : false
    });
  }

  // 9. Save Logo config: POST /api/admin/logo
  if (path === "/api/admin/logo" && method === "POST") {
    const config = getConfig();
    const updated = { ...config, ...body };
    saveConfig(updated);
    return createMockResponse({ success: true, message: "Logo configuration saved on client-side ledger." });
  }

  // 10. Sections config: GET /api/sections
  if (path === "/api/sections" && method === "GET") {
    const config = getConfig();
    return createMockResponse({
      about: config.aboutSection || DEFAULT_ABOUT,
      newsletter: config.newsletterSection || DEFAULT_NEWSLETTER
    });
  }

  // 11. Save Sections config: POST /api/admin/sections
  if (path === "/api/admin/sections" && method === "POST") {
    const config = getConfig();
    if (body.about !== undefined) config.aboutSection = body.about;
    if (body.newsletter !== undefined) config.newsletterSection = body.newsletter;
    saveConfig(config);
    return createMockResponse({ success: true, message: "Sections configuration written onto client-side ledger." });
  }

  // 12. Authentication: POST /api/admin/auth
  if (path === "/api/admin/auth" && method === "POST") {
    const { password } = body || {};
    const config = getConfig();
    const storedPass = (config.passcode || "shailora").trim();
    const isMatch = (password || "").trim() === storedPass;
    return createMockResponse({ authenticated: isMatch });
  }

  // 13. Passcode get: GET /api/admin/passcode
  if (path === "/api/admin/passcode" && method === "GET") {
    const config = getConfig();
    return createMockResponse({ passcode: config.passcode || "shailora" });
  }

  // 14. Passcode change: POST /api/admin/change-passcode
  if (path === "/api/admin/change-passcode" && method === "POST") {
    const { currentPassword, newPassword } = body || {};
    const config = getConfig();
    const storedPass = (config.passcode || "shailora").trim();
    if ((currentPassword || "").trim() !== storedPass) {
      return createMockResponse({ error: "Current passcode is incorrect." }, 401);
    }
    config.passcode = (newPassword || "").trim();
    saveConfig(config);
    return createMockResponse({ success: true, message: "Passcode updated successfully on client-side ledger." });
  }

  // 15. Sound tracks list: GET /api/sounds
  if (path === "/api/sounds" && method === "GET") {
    return createMockResponse(getSounds());
  }

  // 16. Create sound: POST /api/sounds
  if (path === "/api/sounds" && method === "POST") {
    const list = getSounds();
    const newSound = body;
    newSound.id = `sound-${Date.now()}`;
    newSound.active = false;
    list.push(newSound);
    saveSounds(list);
    return createMockResponse(newSound, 201);
  }

  // 17. Update sound: PUT /api/sounds/:id
  if (path.startsWith("/api/sounds/") && method === "PUT") {
    const id = path.replace("/api/sounds/", "");
    const list = getSounds();
    const index = list.findIndex((s) => s.id === id);
    if (index !== -1) {
      if (body.active === true) {
        list.forEach((s) => s.active = false);
      }
      list[index] = { ...list[index], ...body };
      saveSounds(list);
      return createMockResponse(list[index]);
    }
    return createMockResponse({ error: "Sound not found" }, 404);
  }

  // 18. Delete sound: DELETE /api/sounds/:id
  if (path.startsWith("/api/sounds/") && method === "DELETE") {
    const id = path.replace("/api/sounds/", "");
    const list = getSounds();
    const filtered = list.filter((s) => s.id !== id);
    if (list.find((s) => s.id === id)?.active && filtered.length > 0) {
      filtered[0].active = true;
    }
    saveSounds(filtered);
    return createMockResponse({ success: true });
  }

  // 19. File upload: POST /api/upload
  if (path === "/api/upload" && method === "POST") {
    const { fileData, fileName } = body || {};
    // Excellent! Return fileData directly as a base64 data-URL,
    // so it will render perfectly on Netlify/localStorage without needing server files!
    return createMockResponse({ url: fileData, fileName });
  }

  // 20. AI architecture critique: POST /api/projects/:id/ai-critique
  if (path.startsWith("/api/projects/") && path.endsWith("/ai-critique") && method === "POST") {
    const id = path.replace("/api/projects/", "").replace("/ai-critique", "");
    const list = getProjects();
    const project = list.find((p) => p.id === id);
    if (!project) {
      return createMockResponse({ error: "Project not found" }, 404);
    }

    const title = project.title;
    const style = project.architecturalStyle || "Minimalism";
    const materials = (project.materialPalette || []).join(", ");

    const customCritique = {
      philosophy: `The design of ${title} serves as an investigation into silent volumetric presence. Reflecting SHAILORA's core doctrine of minimalist Monumentalism, it represents an intersection between natural topology and pristine human geometry. By refusing extraneous ornamentation, the structure establishes a calm dialogue with its surroundings, framing light and air as the primary building blocks.`,
      spatialExperience: `Walking through the spaces of ${title} reveals an intentional delay in sensory transition. The corridors serve as decompression chambers, slowly revealing massive, double-height volumes. Sunlight penetrates at steep, dramatic angles, creating sharp partitions of shadow and light across the unvarnished floor plates. It feels cold but sheltering, monumental yet deeply intimate.`,
      materialTectonics: `The tectonics of ${title} center around contrast and gravity. Raw mass is built of ${materials}, contrasted against the sleek weightlessness of recessed aluminum frames. The joinery is entirely hidden, making individual structural elements appear as massive, floating blocks that celebrate structural honesty.`,
      environmentalIntegration: `The structure is engineered to dissolve into or firmly anchor its site. Rather than competing with the surrounding landscape, its horizontal volumes guide the eye toward the horizon, celebrating passive sustainability and light shifts.`,
      curatedRecommendations: [
        `Integrate recessed linear skylights to accent the ${materials.split(",")[0] || "concrete"} joints`,
        "Introduce black oxidized steel door profiles for visual sharpness",
        "Complement the structural masses with low-slung bespoke dark wood furniture",
        "Utilize native gravel beds along the base of the walls to blur the outer perimeter"
      ],
      isSimulated: true
    };
    return createMockResponse(customCritique);
  }

  // 21. Link preview and URL resolution: GET /api/resolve-url or /api/link-preview
  if (path === "/api/resolve-url" && method === "GET") {
    const targetUrl = url.searchParams.get("url") || "";
    return createMockResponse({ resolvedUrl: targetUrl });
  }

  if (path === "/api/link-preview" && method === "GET") {
    const targetUrl = url.searchParams.get("url") || "";
    return createMockResponse({
      title: "Atmospheric Architecture - SHAILORA Studio",
      description: `Exploring raw concrete masses and geometric light in context of: ${targetUrl}`,
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    });
  }

  // Default fallback for any other unhandled endpoint
  return createMockResponse({ error: `Not found: ${method} ${path}` }, 404);
};

// Helper function to create standard Response objects
function createMockResponse(data: any, status = 200): Response {
  const jsonString = JSON.stringify(data);
  return new Response(jsonString, {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Netlify-Mock-DB": "true"
    }
  });
}
