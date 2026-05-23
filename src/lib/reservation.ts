import { Prisma } from "@prisma/client";
import { ReservationError } from "./errors";

const RESERVATION_TTL_MINUTES = 10;

export interface ReserveInput {
  productId: string;
  warehouseId: string;
  quantity: number;
}

export async function reserveUnits(
  tx: Prisma.TransactionClient,
  input: ReserveInput,
) {
  const { productId, warehouseId, quantity } = input;

  const [stock] = await tx.$queryRaw<
    Array<{ id: string; total: number; reserved: number }>
  >(
    Prisma.sql`
      SELECT id, total, reserved
      FROM "Stock"
      WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
      FOR UPDATE
    `,
  );

  if (!stock) {
    throw new ReservationError(404, "Stock record not found for this product and warehouse");
  }

  const available = stock.total - stock.reserved;
  if (available < quantity) {
    throw new ReservationError(
      409,
      `Insufficient stock: ${available} available, ${quantity} requested`,
    );
  }

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "Stock"
      SET "reserved" = "reserved" + ${quantity}, "updatedAt" = NOW()
      WHERE id = ${stock.id}
    `,
  );

  const reservation = await tx.reservation.create({
    data: {
      productId,
      warehouseId,
      quantity,
      status: "PENDING",
      expiresAt: new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000),
    },
  });

  return reservation;
}

export async function confirmReservation(
  tx: Prisma.TransactionClient,
  reservationId: string,
) {
  const [reservation] = await tx.$queryRaw<
    Array<{
      id: string;
      status: string;
      expiresAt: Date;
      quantity: number;
      productId: string;
      warehouseId: string;
    }>
  >(
    Prisma.sql`
      SELECT id, status, "expiresAt", quantity, "productId", "warehouseId"
      FROM "Reservation"
      WHERE id = ${reservationId}
      FOR UPDATE
    `,
  );

  if (!reservation) {
    throw new ReservationError(404, "Reservation not found");
  }

  if (reservation.status === "CONFIRMED") {
    return reservation;
  }

  if (reservation.status === "RELEASED") {
    throw new ReservationError(409, "Reservation has already been released");
  }

  if (new Date() > reservation.expiresAt) {
    throw new ReservationError(410, "Reservation has expired");
  }

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "Reservation"
      SET status = 'CONFIRMED', "confirmedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${reservationId}
    `,
  );

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "Stock"
      SET "reserved" = "reserved" - ${reservation.quantity}, "updatedAt" = NOW()
      WHERE "productId" = ${reservation.productId}
        AND "warehouseId" = ${reservation.warehouseId}
    `,
  );

  return { ...reservation, status: "CONFIRMED" };
}

export async function releaseReservation(
  tx: Prisma.TransactionClient,
  reservationId: string,
) {
  const [reservation] = await tx.$queryRaw<
    Array<{
      id: string;
      status: string;
      expiresAt: Date;
      quantity: number;
      productId: string;
      warehouseId: string;
    }>
  >(
    Prisma.sql`
      SELECT id, status, "expiresAt", quantity, "productId", "warehouseId"
      FROM "Reservation"
      WHERE id = ${reservationId}
      FOR UPDATE
    `,
  );

  if (!reservation) {
    throw new ReservationError(404, "Reservation not found");
  }

  if (reservation.status === "RELEASED") {
    return reservation;
  }

  if (reservation.status === "CONFIRMED") {
    throw new ReservationError(409, "Reservation has already been confirmed");
  }

  if (new Date() > reservation.expiresAt) {
    throw new ReservationError(410, "Reservation has expired");
  }

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "Reservation"
      SET status = 'RELEASED', "releasedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${reservationId}
    `,
  );

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "Stock"
      SET "reserved" = "reserved" - ${reservation.quantity}, "updatedAt" = NOW()
      WHERE "productId" = ${reservation.productId}
        AND "warehouseId" = ${reservation.warehouseId}
    `,
  );

  return { ...reservation, status: "RELEASED" };
}

export async function releaseExpiredReservations(
  tx: Prisma.TransactionClient,
) {
  const expired = await tx.$queryRaw<
    Array<{
      id: string;
      quantity: number;
      productId: string;
      warehouseId: string;
    }>
  >(
    Prisma.sql`
      SELECT id, quantity, "productId", "warehouseId"
      FROM "Reservation"
      WHERE status = 'PENDING' AND "expiresAt" <= NOW()
      FOR UPDATE
    `,
  );

  if (expired.length === 0) return 0;

  const ids = expired.map((r) => r.id);

  for (const r of expired) {
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE "Stock"
        SET "reserved" = "reserved" - ${r.quantity}, "updatedAt" = NOW()
        WHERE "productId" = ${r.productId} AND "warehouseId" = ${r.warehouseId}
      `,
    );
  }

  await tx.$executeRaw(
    Prisma.sql`
      UPDATE "Reservation"
      SET status = 'RELEASED', "releasedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ANY(${ids}::text[])
    `,
  );

  return expired.length;
}
