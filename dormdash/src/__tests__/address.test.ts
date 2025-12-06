/**
 * Tests for Address-related functionality
 * Tests: address display text, address validation, default address logic
 */

interface Address {
  id: number;
  label?: string;
  building_name?: string;
  room_number?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

// Address display text utility (from Checkout.tsx)
const getAddressDisplayText = (address: Address): string => {
  if (address.building_name) {
    return address.room_number
      ? `${address.building_name}, ${address.room_number}`
      : address.building_name;
  }
  if (address.street_address) {
    return address.street_address;
  }
  return address.label || "Address";
};

// Validation utilities
const isValidAddress = (address: Partial<Address>): boolean => {
  return !!(address.building_name || address.street_address);
};

const isValidZipCode = (zipCode: string): boolean => {
  return /^\d{5}(-\d{4})?$/.test(zipCode);
};

describe("Address Display Text", () => {
  test("displays building name with room number", () => {
    const address: Address = {
      id: 1,
      building_name: "Gutmann College House",
      room_number: "305",
    };
    expect(getAddressDisplayText(address)).toBe("Gutmann College House, 305");
  });

  test("displays building name without room number", () => {
    const address: Address = {
      id: 1,
      building_name: "Hill College House",
    };
    expect(getAddressDisplayText(address)).toBe("Hill College House");
  });

  test("displays street address when no building name", () => {
    const address: Address = {
      id: 1,
      street_address: "3901 Locust Walk",
    };
    expect(getAddressDisplayText(address)).toBe("3901 Locust Walk");
  });

  test("displays label as fallback", () => {
    const address: Address = {
      id: 1,
      label: "Home",
    };
    expect(getAddressDisplayText(address)).toBe("Home");
  });

  test("displays 'Address' when no information available", () => {
    const address: Address = {
      id: 1,
    };
    expect(getAddressDisplayText(address)).toBe("Address");
  });

  test("prioritizes building name over street address", () => {
    const address: Address = {
      id: 1,
      building_name: "Rodin College House",
      street_address: "3901 Locust Walk",
    };
    expect(getAddressDisplayText(address)).toBe("Rodin College House");
  });
});

describe("Address Validation", () => {
  test("validates address with building name", () => {
    expect(isValidAddress({ building_name: "Gutmann" })).toBe(true);
  });

  test("validates address with street address", () => {
    expect(isValidAddress({ street_address: "123 Main St" })).toBe(true);
  });

  test("rejects address without building or street", () => {
    expect(isValidAddress({ label: "Home", city: "Philadelphia" })).toBe(false);
  });

  test("rejects empty address", () => {
    expect(isValidAddress({})).toBe(false);
  });
});

describe("Zip Code Validation", () => {
  test("accepts 5-digit zip code", () => {
    expect(isValidZipCode("19104")).toBe(true);
  });

  test("accepts 9-digit zip code with hyphen", () => {
    expect(isValidZipCode("19104-1234")).toBe(true);
  });

  test("rejects 4-digit zip code", () => {
    expect(isValidZipCode("1910")).toBe(false);
  });

  test("rejects zip code with letters", () => {
    expect(isValidZipCode("1910A")).toBe(false);
  });

  test("rejects empty string", () => {
    expect(isValidZipCode("")).toBe(false);
  });
});

describe("Default Address Selection", () => {
  const addresses: Address[] = [
    { id: 1, building_name: "Gutmann", is_default: false },
    { id: 2, building_name: "Hill", is_default: true },
    { id: 3, building_name: "Rodin", is_default: false },
  ];

  const findDefaultAddress = (addrs: Address[]): Address | undefined => {
    return addrs.find((a) => a.is_default) || addrs[0];
  };

  test("finds default address", () => {
    const defaultAddr = findDefaultAddress(addresses);
    expect(defaultAddr?.id).toBe(2);
  });

  test("falls back to first address when no default", () => {
    const noDefaultAddresses = addresses.map((a) => ({
      ...a,
      is_default: false,
    }));
    const defaultAddr = findDefaultAddress(noDefaultAddresses);
    expect(defaultAddr?.id).toBe(1);
  });

  test("returns undefined for empty array", () => {
    const defaultAddr = findDefaultAddress([]);
    expect(defaultAddr).toBeUndefined();
  });
});
