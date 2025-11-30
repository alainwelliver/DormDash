import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { Icon } from "@rneui/themed";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";

interface Category {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  name: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  tags: Tag[];

  selectedCategory: number | null;
  selectedTags: number[];
  priceRange: [number, number] | null;

  onApply: (params: {
    category: number | null;
    tags: number[];
    priceRange: [number, number] | null;
  }) => void;

  onClear: () => void;
}

const FilterModal: React.FC<Props> = ({
  visible,
  onClose,
  categories,
  tags,
  selectedCategory,
  selectedTags,
  priceRange,
  onApply,
  onClear,
}) => {
  const [category, setCategory] = useState<number | null>(selectedCategory);
  const [tagIds, setTagIds] = useState<number[]>(selectedTags);
  const [minPrice, setMinPrice] = useState(
    priceRange ? String(priceRange[0] / 100) : "",
  );
  const [maxPrice, setMaxPrice] = useState(
    priceRange ? String(priceRange[1] / 100) : "",
  );

  const toggleTag = (id: number) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const applyFilters = () => {
    const convertedRange: [number, number] | null =
      minPrice || maxPrice
        ? ([
            minPrice ? Math.floor(Number(minPrice) * 100) : 0,
            maxPrice ? Math.floor(Number(maxPrice) * 100) : 99999999,
          ] as [number, number])
        : null;

    onApply({
      category,
      tags: tagIds,
      priceRange: convertedRange,
    });

    onClose();
  };

  const clearAll = () => {
    setCategory(null);
    setTagIds([]);
    setMinPrice("");
    setMaxPrice("");
    onClear();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" type="material-community" size={26} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
            {/* CATEGORY */}
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chipRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.chip,
                    category === cat.id && styles.chipActive,
                  ]}
                  onPress={() =>
                    setCategory(category === cat.id ? null : cat.id)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      category === cat.id && styles.chipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TAGS */}
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.chipRow}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    tagIds.includes(tag.id) && styles.tagChipActive,
                  ]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      tagIds.includes(tag.id) && styles.tagChipTextActive,
                    ]}
                  >
                    #{tag.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* PRICE RANGE */}
            <Text style={styles.sectionTitle}>Price Range ($)</Text>

            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                keyboardType="decimal-pad"
                value={minPrice}
                onChangeText={setMinPrice}
                placeholderTextColor={Colors.mutedGray}
              />
              <Text style={styles.toText}>to</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                keyboardType="decimal-pad"
                value={maxPrice}
                onChangeText={setMaxPrice}
                placeholderTextColor={Colors.mutedGray}
              />
            </View>
          </ScrollView>

          {/* FOOTER BUTTONS */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  container: {
    height: "80%",
    backgroundColor: Colors.white,
    borderTopRightRadius: 22,
    borderTopLeftRadius: 22,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.heading4,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  sectionTitle: {
    ...Typography.heading4,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontWeight: "600",
    color: Colors.darkTeal,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.lightMint,
    borderRadius: BorderRadius.medium,  // 8px
  },
  chipActive: {
    backgroundColor: Colors.primary_blue,
  },
  chipText: {
    color: Colors.darkTeal,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },

  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.medium,  // 8px
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.mutedGray,
  },
  tagChipActive: {
    backgroundColor: Colors.primary_blue,
    borderColor: Colors.primary_blue,
  },
  tagChipText: {
    color: Colors.darkTeal,
  },
  tagChipTextActive: {
    color: Colors.white,
    fontWeight: "600",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: Spacing.md,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    padding: Spacing.sm,
    borderRadius: BorderRadius.medium,  // 8px
    color: Colors.darkTeal,
  },
  toText: {
    ...Typography.bodyMedium,
    color: Colors.mutedGray,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  clearBtn: {
    padding: Spacing.md,
  },
  clearText: {
    ...Typography.bodyLarge,
    color: Colors.mutedGray,
  },
  applyBtn: {
    backgroundColor: Colors.primary_blue,
    paddingHorizontal: 24,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,  // 8px
  },
  applyText: {
    ...Typography.bodyLarge,
    color: Colors.white,
    fontWeight: "700",
  },
});

export default FilterModal;
