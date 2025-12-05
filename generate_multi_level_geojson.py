#!/usr/bin/env python3
"""
Generate multi-level GeoJSON files for dynamic Level of Detail (LOD)
Based on zoom levels: Province → Kabupaten → Kecamatan
"""

import geopandas as gpd
import json
import os
from pathlib import Path

def get_file_size_mb(filepath):
    """Get file size in MB"""
    return os.path.getsize(filepath) / (1024 * 1024)

def count_coordinates(gdf):
    """Count total coordinate points in all geometries"""
    total = 0
    for geom in gdf.geometry:
        if geom.geom_type == 'Polygon':
            total += len(geom.exterior.coords)
            for interior in geom.interiors:
                total += len(interior.coords)
        elif geom.geom_type == 'MultiPolygon':
            for poly in geom.geoms:
                total += len(poly.exterior.coords)
                for interior in poly.interiors:
                    total += len(interior.coords)
    return total

def generate_level_3_kecamatan(input_file, output_file, tolerance=0.0005):
    """
    Level 3: KECAMATAN level (zoom 11+)
    Most detailed view - use low tolerance
    """
    print("\n" + "="*70)
    print("LEVEL 3: KECAMATAN (Zoom 11+) - Detailed View")
    print("="*70)

    print(f"📖 Reading {input_file}...")
    gdf = gpd.read_file(input_file)

    original_size = get_file_size_mb(input_file)
    original_coords = count_coordinates(gdf)

    print(f"✅ Loaded {len(gdf)} kecamatan features")
    print(f"📊 Original: {original_size:.2f} MB, {original_coords:,} points")

    # Simplify
    print(f"🔄 Simplifying with tolerance {tolerance}...")
    gdf['geometry'] = gdf.geometry.simplify(tolerance=tolerance, preserve_topology=True)

    # Add metadata
    gdf['admin_level'] = 'kecamatan'
    gdf['zoom_min'] = 11
    gdf['zoom_max'] = 22

    # Standardize column names
    gdf = gdf.rename(columns={
        'nama_prop': 'nama_provinsi',
        'kode_prop_': 'kode_provinsi',
        'nama_kab': 'nama_kabupaten',
        'kode_kab_s': 'kode_kabupaten',
        'nama_kec': 'nama_kecamatan',
        'kode_kec_s': 'kode_kecamatan'
    })

    # Save
    print(f"💾 Saving to {output_file}...")
    gdf.to_file(output_file, driver='GeoJSON')

    new_size = get_file_size_mb(output_file)
    new_coords = count_coordinates(gdf)

    print(f"✅ Result: {new_size:.2f} MB, {new_coords:,} points")
    print(f"📉 Reduction: {((original_size - new_size) / original_size * 100):.1f}%")

    return gdf

def generate_level_2_kabupaten(gdf_kecamatan, output_file, tolerance=0.005):
    """
    Level 2: KABUPATEN level (zoom 7-10)
    Medium detail - dissolve by kabupaten with improved boundary cleaning
    """
    print("\n" + "="*70)
    print("LEVEL 2: KABUPATEN (Zoom 7-10) - Medium View")
    print("="*70)

    print(f"🔄 Dissolving {len(gdf_kecamatan)} kecamatan into kabupaten...")

    # Step 1: Fix any topology issues first
    print("🔧 Fixing geometry topology...")
    gdf_kecamatan = gdf_kecamatan.copy()
    gdf_kecamatan['geometry'] = gdf_kecamatan.geometry.make_valid()

    # Step 2: Project to UTM for accurate buffering
    print("🗺️  Projecting to UTM 47N for accurate buffering...")
    original_crs = gdf_kecamatan.crs
    utm_crs = "EPSG:32647"  # WGS 84 / UTM zone 47N
    gdf_kecamatan = gdf_kecamatan.to_crs(utm_crs)

    # Step 3: Apply buffer to merge touching polygons (100m for kabupaten level)
    print("🔧 Applying 100m buffer to merge adjacent boundaries...")
    gdf_kecamatan['geometry'] = gdf_kecamatan.geometry.buffer(100)

    # Step 4: Dissolve by kabupaten using explicit unary_union
    print("🔄 Merging kecamatan boundaries...")
    from shapely.ops import unary_union

    kabupaten_list = []
    for (kode_kab, nama_kab, kode_prov, nama_prov), group in gdf_kecamatan.groupby(
        ['kode_kabupaten', 'nama_kabupaten', 'kode_provinsi', 'nama_provinsi']
    ):
        # Use unary_union to merge all geometries
        merged_geom = unary_union(group.geometry.tolist())

        kabupaten_list.append({
            'kode_provinsi': kode_prov,
            'nama_provinsi': nama_prov,
            'kode_kabupaten': kode_kab,
            'nama_kabupaten': nama_kab,
            'geometry': merged_geom
        })

    gdf_kabupaten = gpd.GeoDataFrame(kabupaten_list, crs=utm_crs)

    print(f"✅ Created {len(gdf_kabupaten)} kabupaten polygons")

    # Step 5: Shrink back to original size
    print("🔧 Shrinking back to original boundary size...")
    gdf_kabupaten['geometry'] = gdf_kabupaten.geometry.buffer(-100)

    # Step 6: Clean up artifacts
    print("🔧 Cleaning up geometry artifacts...")
    gdf_kabupaten['geometry'] = gdf_kabupaten.geometry.buffer(0)

    # Step 7: Project back to WGS84
    print("🗺️  Projecting back to WGS84...")
    gdf_kabupaten = gdf_kabupaten.to_crs(original_crs)

    # Step 8: Simplify more aggressively
    print(f"🔄 Simplifying with tolerance {tolerance}...")
    gdf_kabupaten['geometry'] = gdf_kabupaten.geometry.simplify(
        tolerance=tolerance,
        preserve_topology=True
    )

    # Add metadata
    gdf_kabupaten['admin_level'] = 'kabupaten'
    gdf_kabupaten['zoom_min'] = 7
    gdf_kabupaten['zoom_max'] = 10

    # Clean up columns
    columns_to_keep = [
        'kode_provinsi', 'nama_provinsi',
        'kode_kabupaten', 'nama_kabupaten',
        'admin_level', 'zoom_min', 'zoom_max',
        'geometry'
    ]
    gdf_kabupaten = gdf_kabupaten[columns_to_keep]

    # Save
    print(f"💾 Saving to {output_file}...")
    gdf_kabupaten.to_file(output_file, driver='GeoJSON')

    file_size = get_file_size_mb(output_file)
    coords = count_coordinates(gdf_kabupaten)

    print(f"✅ Result: {file_size:.2f} MB, {coords:,} points")
    print(f"📊 Average points per kabupaten: {coords // len(gdf_kabupaten):,}")

    return gdf_kabupaten

def generate_level_1_provinsi(gdf_kabupaten, output_file, tolerance=0.01):
    """
    Level 1: PROVINSI level (zoom 1-6)
    Low detail - dissolve by provinsi with aggressive boundary merging
    """
    print("\n" + "="*70)
    print("LEVEL 1: PROVINSI (Zoom 1-6) - Overview")
    print("="*70)

    print(f"🔄 Dissolving {len(gdf_kabupaten)} kabupaten into provinsi...")

    # Step 1: Fix any topology issues first
    print("🔧 Fixing geometry topology...")
    gdf_kabupaten = gdf_kabupaten.copy()
    gdf_kabupaten['geometry'] = gdf_kabupaten.geometry.make_valid()

    # Step 2: Project to UTM zone 47N (appropriate for Sumatra) for accurate buffering
    print("🗺️  Projecting to UTM 47N for accurate buffering...")
    original_crs = gdf_kabupaten.crs
    utm_crs = "EPSG:32647"  # WGS 84 / UTM zone 47N (covers Sumatra)
    gdf_kabupaten = gdf_kabupaten.to_crs(utm_crs)

    # Step 3: Apply buffer to merge touching polygons (3km buffer for province level)
    print("🔧 Applying 3km buffer to merge adjacent boundaries...")
    gdf_kabupaten['geometry'] = gdf_kabupaten.geometry.buffer(3000)

    # Step 4: Dissolve by provinsi using explicit unary_union
    print("🔄 Merging kabupaten boundaries...")
    from shapely.ops import unary_union

    provinsi_list = []
    for (kode_prov, nama_prov), group in gdf_kabupaten.groupby(['kode_provinsi', 'nama_provinsi']):
        # Use unary_union to merge all geometries
        merged_geom = unary_union(group.geometry.tolist())

        provinsi_list.append({
            'kode_provinsi': kode_prov,
            'nama_provinsi': nama_prov,
            'geometry': merged_geom
        })

    gdf_provinsi = gpd.GeoDataFrame(provinsi_list, crs=utm_crs)

    print(f"✅ Created {len(gdf_provinsi)} provinsi polygons")

    # Step 5: Shrink back by same amount to return to original size
    print("🔧 Shrinking back to original boundary size...")
    gdf_provinsi['geometry'] = gdf_provinsi.geometry.buffer(-3000)

    # Step 6: Clean up with buffer(0) to remove any artifacts
    print("🔧 Cleaning up geometry artifacts...")
    gdf_provinsi['geometry'] = gdf_provinsi.geometry.buffer(0)

    # Step 7: Remove tiny polygon parts (< 0.5% of total area) for cleaner province-level view
    print("🔧 Removing tiny islands/fragments (<0.5% of area) for cleaner visualization...")
    from shapely.geometry import MultiPolygon, Polygon

    def filter_small_polygons(geom, threshold=0.005):
        """Remove polygon parts smaller than threshold (0.5% = 0.005)"""
        if geom.geom_type == 'Polygon':
            return geom
        elif geom.geom_type == 'MultiPolygon':
            total_area = geom.area
            # Keep only parts larger than threshold
            large_parts = [poly for poly in geom.geoms if poly.area / total_area >= threshold]
            if len(large_parts) == 0:
                # Keep at least the largest part
                return max(geom.geoms, key=lambda p: p.area)
            elif len(large_parts) == 1:
                return large_parts[0]
            else:
                return MultiPolygon(large_parts)
        return geom

    gdf_provinsi['geometry'] = gdf_provinsi.geometry.apply(filter_small_polygons)

    # Step 8: Check geometry type after filtering
    for idx, row in gdf_provinsi.iterrows():
        geom = row.geometry
        geom_type = geom.geom_type
        if geom_type == 'MultiPolygon':
            num_parts = len(geom.geoms)
            print(f"   {row['nama_provinsi']}: MultiPolygon with {num_parts} parts (after filtering)")
        else:
            print(f"   {row['nama_provinsi']}: {geom_type}")

    # Step 9: Project back to WGS84 (original CRS)
    print("🗺️  Projecting back to WGS84...")
    gdf_provinsi = gdf_provinsi.to_crs(original_crs)

    # Step 10: Simplify very aggressively
    print(f"🔄 Simplifying with tolerance {tolerance}...")
    gdf_provinsi['geometry'] = gdf_provinsi.geometry.simplify(
        tolerance=tolerance,
        preserve_topology=True
    )

    # Add metadata
    gdf_provinsi['admin_level'] = 'provinsi'
    gdf_provinsi['zoom_min'] = 1
    gdf_provinsi['zoom_max'] = 6

    # Clean up columns
    columns_to_keep = [
        'kode_provinsi', 'nama_provinsi',
        'admin_level', 'zoom_min', 'zoom_max',
        'geometry'
    ]
    gdf_provinsi = gdf_provinsi[columns_to_keep]

    # Save
    print(f"💾 Saving to {output_file}...")
    gdf_provinsi.to_file(output_file, driver='GeoJSON')

    file_size = get_file_size_mb(output_file)
    coords = count_coordinates(gdf_provinsi)

    print(f"✅ Result: {file_size:.2f} MB, {coords:,} points")
    print(f"📊 Average points per provinsi: {coords // len(gdf_provinsi):,}")

    return gdf_provinsi

def create_combined_file(gdf_provinsi, gdf_kabupaten, gdf_kecamatan, output_file):
    """
    Create a single combined GeoJSON with all levels
    """
    print("\n" + "="*70)
    print("CREATING COMBINED FILE (All Levels)")
    print("="*70)

    # Combine all levels
    gdf_combined = gpd.GeoDataFrame(
        pd.concat([gdf_provinsi, gdf_kabupaten, gdf_kecamatan], ignore_index=True),
        crs=gdf_provinsi.crs
    )

    print(f"💾 Saving combined file to {output_file}...")
    gdf_combined.to_file(output_file, driver='GeoJSON')

    file_size = get_file_size_mb(output_file)
    print(f"✅ Combined file: {file_size:.2f} MB")
    print(f"📊 Total features: {len(gdf_combined)}")

def main():
    print("\n" + "="*70)
    print("🗺️  MULTI-LEVEL GEOJSON GENERATOR")
    print("   Dynamic Level of Detail (LOD) for Web Maps")
    print("="*70)

    input_file = "bnpb.geojson"

    if not os.path.exists(input_file):
        print(f"❌ Error: {input_file} not found!")
        return

    # Generate Level 3: Kecamatan (most detailed)
    gdf_kecamatan = generate_level_3_kecamatan(
        input_file,
        "bnpb_level3_kecamatan.geojson",
        tolerance=0.0005
    )

    # Generate Level 2: Kabupaten (medium detail)
    gdf_kabupaten = generate_level_2_kabupaten(
        gdf_kecamatan,
        "bnpb_level2_kabupaten.geojson",
        tolerance=0.005
    )

    # Generate Level 1: Provinsi (low detail)
    gdf_provinsi = generate_level_1_provinsi(
        gdf_kabupaten,
        "bnpb_level1_provinsi.geojson",
        tolerance=0.01
    )

    # Summary
    print("\n" + "="*70)
    print("📊 SUMMARY - LEVEL OF DETAIL PYRAMID")
    print("="*70)

    files = [
        ("bnpb_level1_provinsi.geojson", "Level 1: Provinsi", "Zoom 1-6"),
        ("bnpb_level2_kabupaten.geojson", "Level 2: Kabupaten", "Zoom 7-10"),
        ("bnpb_level3_kecamatan.geojson", "Level 3: Kecamatan", "Zoom 11+")
    ]

    total_size = 0
    for filename, level, zoom in files:
        if os.path.exists(filename):
            size = get_file_size_mb(filename)
            total_size += size
            print(f"✅ {level:<20} ({zoom:<12}) → {size:>6.2f} MB - {filename}")

    print("─"*70)
    print(f"📦 Total size: {total_size:.2f} MB")
    print("="*70)

    print("\n💡 USAGE:")
    print("  Zoom 1-6:   Load bnpb_level1_provinsi.geojson   (overview)")
    print("  Zoom 7-10:  Load bnpb_level2_kabupaten.geojson  (medium)")
    print("  Zoom 11+:   Load bnpb_level3_kecamatan.geojson  (detailed)")
    print("\n✅ All files generated successfully!\n")

if __name__ == "__main__":
    import pandas as pd  # Import here to avoid issues if not needed
    main()
