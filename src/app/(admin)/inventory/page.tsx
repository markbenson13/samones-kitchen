import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import {
  addToInventory,
  removeFromInventory,
  restockInventory,
  sellFromInventory,
  setInventoryStock,
} from "@/app/actions/inventory";
import { InventorySection } from "./inventory-section";

export default async function InventoryPage() {
  // One fetch of every food item with its (possibly absent) inventory row
  // covers both lists below — tracked items regardless of active status
  // (a discontinued item's leftover stock should still be manageable here),
  // and untracked-but-active items as restock candidates — instead of two
  // separate queries.
  const allFoodItems = await prisma.foodItem.findMany({
    orderBy: { name: "asc" },
    include: { inventory: true },
  });
  const inventory = allFoodItems.filter((item) => item.inventory);
  const untracked = allFoodItems.filter(
    (item) => !item.inventory && item.isActive
  );

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
        setStockAction={setInventoryStock}
        untracked={untracked.map((item) => ({ id: item.id, name: item.name }))}
        items={inventory.map((item) => ({
          id: item.inventory!.id,
          name: item.name,
          sellingPrice: toNumber(item.sellingPrice.toString()),
          stock: item.inventory!.stock,
        }))}
      />
    </div>
  );
}
