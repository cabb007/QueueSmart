import { useState } from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from './Landing';
import QueueStatus from './QueueStatus';


export default function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/QueueStatus" element={<QueueStatus />} />
      </Routes>
    </BrowserRouter>
  )
}