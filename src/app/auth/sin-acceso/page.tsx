import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import SinAccesoClient from "./SinAccesoClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function SinAccesoPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName = "";
  const userEmail = user?.email || "";

  if (user) {
    const { data: profile } = await supabase
      .from("perfiles")
      .select("nombre_completo")
      .eq("id", user.id)
      .maybeSingle();

    userName = profile?.nombre_completo || user.user_metadata?.full_name || "";
  }

  return (
    <>
      <Header />
      <SinAccesoClient userName={userName} userEmail={userEmail} />
      <Footer />
    </>
  );
}
