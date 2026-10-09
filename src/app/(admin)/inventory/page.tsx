import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import {
  addToInventory,
  removeFromInventory,
  restockInventory,
  sellFromInventory,
} from "@/app/actions/inventory";
import { InventorySection } from "./inventory-section";

export default async function InventoryPage() {
  const [inventory, untracked] = await Promise.all([
    prisma.inventory.findMany({
      include: { foodItem: { select: { name: true, sellingPrice: true } } },
      orderBy: { foodItem: { name: "asc" } },
    }),
    prisma.foodItem.findMany({
      where: { isActive: true, inventory: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-brown">Inventory</h1>
        <p className="mt-1 text-sm text-brand-brown-light">
          Stock for items made in a batch and sold down over several days
          (currently desserts) — restock here instead of logging a Sales
          entry for them every day. Selling here (or through a customer
          order) draws down the same stock and still counts toward Dashboard
          revenue.
        </p>
      </div>

      <InventorySection
        addAction={addToInventory}
        removeAction={removeFromInventory}
        restockAction={restockInventory}
        sellAction={sellFromInventory}
        untracked={untracked}
        items={inventory.map((row) => ({
          id: row.id,
          name: row.foodItem.name,
          sellingPrice: toNumber(row.foodItem.sellingPrice.toString()),
          stock: row.stock,
        }))}
      />
    </div>
  );
}
