import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import MomentView from "./views/Moment.jsx";
import SlideShowView from "./views/Slideshow.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/slideshow" element={<SlideShowView />} />
        <Route path="/:id" element={<MomentView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
