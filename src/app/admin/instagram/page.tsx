import { redirect } from "next/navigation";

// La pestaña pasó a llamarse "Redes" (publica en Instagram y Facebook): se conserva la dirección vieja.
export default function InstagramPage() {
  redirect("/admin/redes");
}
