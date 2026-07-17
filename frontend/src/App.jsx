import { Routes, Route } from "react-router-dom";
import { Compass } from "lucide-react";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import MosqueProfile from "./pages/MosqueProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/mosque/:id" element={<MosqueProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

function NotFound() {
  return (
    <div className="container py-5 text-center">
      <Compass size={42} className="text-mc" aria-hidden="true" />
      <h3 className="mt-3">Page not found</h3>
      <a href="/" className="btn btn-mc mt-2">Back home</a>
    </div>
  );
}
