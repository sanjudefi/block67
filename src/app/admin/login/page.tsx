"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect old /admin/login → /admin-login to avoid layout loop
export default function AdminLoginRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin-login"); }, [router]);
  return null;
}
