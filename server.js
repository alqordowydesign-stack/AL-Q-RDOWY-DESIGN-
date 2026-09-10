const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "CHANGE-ME-BEFORE-PUBLISHING";

const root = __dirname;
const dataDir = path.join(root, "data");
const uploadDir = path.join(root, "uploads");
const dataFile = path.join(dataDir, "gallery.json");

fs.mkdirSync(dataDir, {recursive:true});
fs.mkdirSync(uploadDir, {recursive:true});
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, "[]");

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(root,"public")));
app.use("/uploads", express.static(uploadDir));

function readGallery(){
  try { return JSON.parse(fs.readFileSync(dataFile,"utf8")); }
  catch(e){ return []; }
}
function saveGallery(items){ fs.writeFileSync(dataFile, JSON.stringify(items,null,2)); }

function requireAdmin(req,res,next){
  const token = req.headers["x-admin-token"];
  if (!token || token !== ADMIN_PASSWORD) return res.status(401).json({error:"Non autorisé"});
  next();
}

const storage = multer.diskStorage({
  destination: (_,__,cb)=>cb(null,uploadDir),
  filename: (_,file,cb)=>{
    const safe = Date.now()+"-"+file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_");
    cb(null,safe);
  }
});
const upload = multer({storage, limits:{fileSize: 12*1024*1024}});

app.get("/api/gallery",(req,res)=>res.json(readGallery()));

app.post("/api/admin/login",(req,res)=>{
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({error:"Mot de passe incorrect"});
  res.json({token: ADMIN_PASSWORD});
});

app.post("/api/admin/upload", requireAdmin, upload.single("image"), (req,res)=>{
  if (!req.file) return res.status(400).json({error:"Aucune image"});
  const items=readGallery();
  const item={
    id:Date.now().toString(),
    filename:req.file.filename,
    title:(req.body.title||"").trim(),
    category:(req.body.category||"Autre").trim(),
    description:(req.body.description||"").trim(),
    createdAt:new Date().toISOString()
  };
  items.unshift(item); saveGallery(items); res.json(item);
});

app.delete("/api/admin/gallery/:id", requireAdmin, (req,res)=>{
  const items=readGallery();
  const item=items.find(x=>x.id===req.params.id);
  if(!item) return res.status(404).json({error:"Création introuvable"});
  const file=path.join(uploadDir,item.filename);
  if(fs.existsSync(file)) fs.unlinkSync(file);
  saveGallery(items.filter(x=>x.id!==req.params.id));
  res.json({ok:true});
});

app.put("/api/admin/gallery/:id", requireAdmin, (req,res)=>{
  const items=readGallery();
  const item=items.find(x=>x.id===req.params.id);
  if(!item) return res.status(404).json({error:"Création introuvable"});
  if(req.body.title!==undefined) item.title=String(req.body.title).trim();
  if(req.body.category!==undefined) item.category=String(req.body.category).trim();
  if(req.body.description!==undefined) item.description=String(req.body.description).trim();
  saveGallery(items); res.json(item);
});

app.get("/admin",(req,res)=>res.sendFile(path.join(root,"public","admin.html")));

app.listen(PORT,()=>console.log(`AL-QÔRDOWY DESIGN: http://localhost:${PORT}`));
