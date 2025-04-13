"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Search, Package, Truck, Box, MapPin, Calendar, Clock, Info, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Dynamic import to avoid SSR issues with the map
const ShipmentMap = dynamic(() => import("@/components/ShipmentMap"), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">Loading map...</div>
});

// Types for coordinates
type Coords = {
  lat: number;
  lon: number;
};

// Mock data for demonstration
const mockShipmentData = {
  consignmentNumber: "SHP12345678",
  status: "In Transit",
  estimatedDelivery: "April 15, 2025",
  origin: "New York, NY",
  destination: "San Francisco, CA",
  currentLocation: "Denver, CO",
  weight: "5.2 kg",
  carrier: "Express Logistics",
  type: "Air Freight",
  fromCoords: null as Coords | null,
  toCoords: null as Coords | null,
  currentCoords: null as Coords | null,
  timeline: [
    { location: "New York, NY", status: "Picked up", date: "April 8, 2025", time: "10:30 AM", completed: true },
    { location: "Chicago, IL", status: "Arrived at sort facility", date: "April 10, 2025", time: "2:15 PM", completed: true },
    { location: "Denver, CO", status: "In transit", date: "April 12, 2025", time: "9:45 AM", completed: true },
    { location: "Las Vegas, NV", status: "Out for delivery", date: "April 14, 2025", time: "8:00 AM", completed: false },
    { location: "San Francisco, CA", status: "Delivered", date: "April 15, 2025", time: "Expected by 6:00 PM", completed: false }
  ]
};

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shipmentData, setShipmentData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);

  const handleSearch = () => {
    setIsLoading(true);
    setError("");
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      if (trackingNumber.trim() === "") {
        setError("Please enter a valid tracking number");
        setShipmentData(null);
      } else {
        // Use mock data and then fetch coordinates
        setShipmentData(mockShipmentData);
        fetchCoordinates();
      }
      setIsLoading(false);
    }, 1500);
  };

  const fetchCoordinates = async () => {
    try {
      // Get coordinates for origin, destination, and current location
      const origin = await getCoords(mockShipmentData.origin);
      const destination = await getCoords(mockShipmentData.destination);
      const current = await getCoords(mockShipmentData.currentLocation);
      
      // Update the shipment data with coordinates
      setShipmentData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          fromCoords: origin,
          toCoords: destination,
          currentCoords: current
        };
      });
      
      setMapLoaded(true);
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      setError("Could not load map coordinates");
    }
  };

  async function getCoords(place) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
      );
      const data = await res.json();
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
      return null;
    } catch (error) {
      console.error("Error in getCoords:", error);
      return null;
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-center mb-8">Track Your Shipment</h1>
      
      {/* Search Form */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Enter your tracking number"
            className="pl-10 w-full"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isLoading}
          className="px-6"
        >
          {isLoading ? "Searching..." : "Track"}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Shipment Results */}
      {shipmentData && (
        <div className="space-y-6">
          {/* Status Overview Card */}
          <Card className="overflow-hidden border-t-4 border-t-blue-500">
            <CardHeader className="bg-gray-50">
              <div className="flex justify-between items-center">
                <CardTitle>Shipment {shipmentData.consignmentNumber}</CardTitle>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {shipmentData.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Estimated Delivery</p>
                    <p className="font-medium">{shipmentData.estimatedDelivery}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Current Location</p>
                    <p className="font-medium">{shipmentData.currentLocation}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Box className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Weight</p>
                    <p className="font-medium">{shipmentData.weight}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Truck className="text-gray-500" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Carrier</p>
                    <p className="font-medium">{shipmentData.carrier}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map View */}
          {shipmentData.fromCoords && shipmentData.toCoords && (
            <Card>
              <CardHeader>
                <CardTitle>Shipment Route Map</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] w-full rounded-lg overflow-hidden">
                  <ShipmentMap 
                    from={shipmentData.fromCoords} 
                    to={shipmentData.toCoords} 
                    current={shipmentData.currentCoords}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tracking Animation */}
          <Card>
            <CardHeader>
              <CardTitle>Shipment Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 relative bg-gray-50 rounded-lg overflow-hidden">
                {/* Origin Point */}
                <div className="absolute left-10 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <p className="text-xs mt-1">{shipmentData.origin}</p>
                </div>
                
                {/* Destination Point */}
                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                  <p className="text-xs mt-1">{shipmentData.destination}</p>
                </div>
                
                {/* Path Line */}
                <div className="absolute left-14 right-14 top-1/2 h-1 bg-gray-200 transform -translate-y-1/2"></div>
                
                {/* Progress Line */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "60%" }}
                  transition={{ duration: 2 }}
                  className="absolute left-14 top-1/2 h-1 bg-green-500 transform -translate-y-1/2"
                ></motion.div>
                
                {/* Moving Package */}
                <motion.div
                  initial={{ left: "10%" }}
                  animate={{ left: "60%" }}
                  transition={{ duration: 2 }}
                  className="absolute top-1/2 transform -translate-y-1/2"
                >
                  <motion.div 
                    animate={{ y: [0, -10, 0] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Package size={24} className="text-blue-500" />
                  </motion.div>
                </motion.div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Tracking Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {shipmentData.timeline.map((event, index) => (
                  <div key={index} className="flex">
                    {/* Status Indicator */}
                    <div className="flex flex-col items-center mr-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${event.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        {event.completed ? (
                          <CheckCircle size={16} />
                        ) : (
                          <Clock size={16} />
                        )}
                      </div>
                      {index < shipmentData.timeline.length - 1 && (
                        <div className={`w-0.5 h-16 ${event.completed ? 'bg-green-200' : 'bg-gray-200'}`}></div>
                      )}
                    </div>
                    
                    {/* Event Details */}
                    <div className="pb-6">
                      <p className="font-medium">{event.status}</p>
                      <p className="text-sm text-gray-500">{event.location}</p>
                      <p className="text-xs text-gray-400">{event.date} • {event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}