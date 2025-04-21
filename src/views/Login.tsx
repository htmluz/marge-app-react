import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  console.log("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(username, password);
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao fazer login:", error);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Login</button>
      </form>
      <div>
        <p>aaaaaaaa</p>
      </div>
    </>
  );
}
