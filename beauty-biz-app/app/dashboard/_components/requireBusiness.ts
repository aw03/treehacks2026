"use client";

export function getBusinessIdOrThrow(): string {
  const id = localStorage.getItem("businessId");
  if (!id) throw new Error("No businessId found. Go to /setup.");
  return id;
}
