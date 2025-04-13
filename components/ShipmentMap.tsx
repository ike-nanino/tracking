"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { LatLngExpression, Icon } from "leaflet";

// Add marker icons
const originIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destinationIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const currentLocationIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "current-location-pulse"
});

type Coords = {
  lat: number;
  lon: number;
};

type Props = {
  from: Coords;
  to: Coords;
  current?: Coords | null;
};

function AnimateMap({ from, to, current, routeData }: Props & { routeData: any }) {
  const map = useMap();

  useEffect(() => {
    if (routeData && routeData.length > 0) {
      // Create bounds from the route data
      const bounds = routeData.map(point => [point[0], point[1]]);
      map.fitBounds(bounds);
    } else {
      // Fallback to original points if no route data
      const points: LatLngExpression[] = [
        [from.lat, from.lon],
        [to.lat, to.lon],
      ];
      
      if (current) {
        points.push([current.lat, current.lon]);
      }
      
      map.fitBounds(points as LatLngExpression[]);
    }
  }, [from, to, current, routeData, map]);

  return null;
}

export default function ShipmentMap({ from, to, current }: Props) {
  const [routeData, setRouteData] = useState<LatLngExpression[]>([]);
  const [completedRoute, setCompletedRoute] = useState<LatLngExpression[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchRoadRoute() {
      try {
        setIsLoading(true);
        
        // Use OSRM (Open Source Routing Machine) API to get real road routes
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch route data");
        }
        
        const data = await response.json();
        
        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          throw new Error("No route found");
        }
        
        // Extract route coordinates (OSRM returns [lon, lat] but Leaflet needs [lat, lon])
        const coordinates = data.routes[0].geometry.coordinates.map(
          coord => [coord[1], coord[0]] as LatLngExpression
        );
        
        setRouteData(coordinates);
        
        // Calculate completed portion of the route
        if (current) {
          calculateCompletedRoute(coordinates);
        } else {
          // If no current position, default to 60% of the route
          const completionPoint = Math.floor(coordinates.length * 0.6);
          setCompletedRoute(coordinates.slice(0, completionPoint));
        }
      } catch (err) {
        console.error("Error fetching road route:", err);
        setError("Could not load road route data");
        
        // Fall back to a simpler route using straight lines or slight curves
        const fallbackRoute = generateFallbackRoute();
        setRouteData(fallbackRoute);
        
        if (current) {
          const completionPoint = Math.floor(fallbackRoute.length * 0.6);
          setCompletedRoute(fallbackRoute.slice(0, completionPoint));
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRoadRoute();
  }, [from, to, current]);
  
  const calculateCompletedRoute = (fullRoute: LatLngExpression[]) => {
    if (!current || fullRoute.length === 0) return;
    
    // Find the point on the route closest to current location
    let closestPointIndex = 0;
    let closestDistance = Number.MAX_VALUE;
    
    fullRoute.forEach((point, index) => {
      // Extract lat/lon from the point
      const pointLat = Array.isArray(point) ? Number(point[0]) : 0;
      const pointLon = Array.isArray(point) ? Number(point[1]) : 0;
      
      // Calculate distance to current location
      const distance = Math.sqrt(
        Math.pow(current.lat - pointLat, 2) + 
        Math.pow(current.lon - pointLon, 2)
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPointIndex = index;
      }
    });
    
    // Set completed route to portion up to closest point
    setCompletedRoute(fullRoute.slice(0, closestPointIndex + 1));
  };
  
  const generateFallbackRoute = () => {
    // Create a simple curved route as fallback
    const points: LatLngExpression[] = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      
      // Linear interpolation with a slight curve
      const lat = from.lat * (1 - t) + to.lat * t;
      const lon = from.lon * (1 - t) + to.lon * t;
      
      // Add a slight curve using sin function
      const latOffset = (Math.sin(Math.PI * t) * 0.02) * (to.lon - from.lon);
      const lonOffset = (Math.sin(Math.PI * t) * 0.02) * (from.lat - to.lat);
      
      points.push([lat + latOffset, lon + lonOffset]);
    }
    
    return points;
  };
  
  // Default position for the map
  const defaultPosition: LatLngExpression = [from.lat, from.lon];

  return (
    <MapContainer center={defaultPosition} zoom={5} scrollWheelZoom={true} className="h-full w-full z-0">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      
      {/* Display loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
          <div className="text-lg">Loading route data...</div>
        </div>
      )}
      
      {/* Display error message if any */}
      {error && !isLoading && (
        <div className="absolute bottom-4 left-4 bg-red-100 text-red-700 px-4 py-2 rounded z-10">
          {error}
        </div>
      )}
      
      {/* Origin marker */}
      <Marker position={[from.lat, from.lon]} icon={originIcon} />
      
      {/* Destination marker */}
      <Marker position={[to.lat, to.lon]} icon={destinationIcon} />
      
      {/* Current location marker */}
      {current && (
        <Marker position={[current.lat, current.lon]} icon={currentLocationIcon} />
      )}
      
      {/* Full route path */}
      {routeData.length > 0 && (
        <Polyline 
          positions={routeData} 
          color="gray" 
          weight={3} 
          dashArray="5,10" 
          opacity={0.7}
        />
      )}
      
      {/* Completed portion of route */}
      {completedRoute.length > 0 && (
        <Polyline 
          positions={completedRoute} 
          color="blue" 
          weight={4}
          opacity={0.9}
        />
      )}
      
      <AnimateMap from={from} to={to} current={current} routeData={routeData} />
    </MapContainer>
  );
}