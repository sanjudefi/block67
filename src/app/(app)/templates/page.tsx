"use client";
// /templates → redirect to /use-cases
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TemplatesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/use-cases"); }, [router]);
  return null;
}
