import { redirect } from "next/navigation";

// La primera pantalla de la app es el login
export default function Home() {
  redirect("/login");
}
