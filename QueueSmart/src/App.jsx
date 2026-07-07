import { useState } from "react";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

export default function App() {
  const [screen, setScreen] = useState("login");

  return screen === "login" ? (
    <Login
      onLogin={() => {}}
      onGoRegister={() => setScreen("register")}
    />
  ) : (
    <Register
      onGoLogin={() => setScreen("login")}
    />
  );
}