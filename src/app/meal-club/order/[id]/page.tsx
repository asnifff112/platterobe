export const instant = false;

import { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConfirmedOrderClient from "./ConfirmedOrderClient";
import { getSubscriptionById } from "@/lib/meal-club-db";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const subscription = await getSubscriptionById(id);

  if (!subscription) {
    return {
      title: "Order Not Found — Meal Club | PLATTEROBE",
    };
  }

  return {
    title: `Confirmed Order #${subscription.id.slice(0, 8).toUpperCase()} — Meal Club | PLATTEROBE`,
    description: `Confirmed meal subscription for ${subscription.customerName}. Daily meal schedule locked and scheduled.`,
  };
}

export default async function ConfirmedOrderPage({ params }: Props) {
  await connection();
  const { id } = await params;
  const subscription = await getSubscriptionById(id);

  if (!subscription) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-[#FDFBF7] pt-20 md:pt-24 pb-16">
        <ConfirmedOrderClient subscription={subscription} />
      </main>
      <Footer />
    </>
  );
}
