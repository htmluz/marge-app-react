import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="space-y-4 w-lg">
        <h2 className="text-2xl font-bold cursor-default selection:bg-primary selection:text-primary-foreground">
          Welcome back!
        </h2>
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <Button type="submit" className="w-full">
          Login
        </Button>
      </form>
    </div>
  );
}
