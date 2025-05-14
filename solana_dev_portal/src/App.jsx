import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const categories = ["Bots", "Smart Contracts", "NFT Tools", "Wallet Utilities", "Staking"];

export default function App() {
  return (
    <main className="p-4">
      <h1 className="text-4xl font-bold mb-6">Solana Dev Portal</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Card key={cat}>
            <CardContent>
              <h2 className="text-xl font-semibold mb-2">{cat}</h2>
              <p>Discover helpful code snippets and developer tools for {cat}.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
