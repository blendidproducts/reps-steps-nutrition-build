import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Ruler, TrendingUp, Plus, Calendar, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BodyMeasurements() {
  const [measurements, setMeasurements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight_lbs: '',
    body_fat_percentage: '',
    chest_inches: '',
    waist_inches: '',
    hips_inches: '',
    bicep_left_inches: '',
    bicep_right_inches: '',
    thigh_left_inches: '',
    thigh_right_inches: '',
    calf_left_inches: '',
    calf_right_inches: '',
    notes: ''
  });

  useEffect(() => {
    loadMeasurements();
  }, []);

  const loadMeasurements = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.BodyMeasurement.list('-date');
      setMeasurements(data);
    } catch (error) {
      console.error('Failed to load measurements:', error);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filter out empty values
    const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null) {
        acc[key] = key === 'notes' ? value : (key === 'date' ? value : parseFloat(value));
      }
      return acc;
    }, {});

    if (!cleanedData.date) {
      toast.error('Date is required');
      return;
    }

    try {
      await base44.entities.BodyMeasurement.create(cleanedData);
      toast.success('Measurement added!');
      setShowForm(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        weight_lbs: '',
        body_fat_percentage: '',
        chest_inches: '',
        waist_inches: '',
        hips_inches: '',
        bicep_left_inches: '',
        bicep_right_inches: '',
        thigh_left_inches: '',
        thigh_right_inches: '',
        calf_left_inches: '',
        calf_right_inches: '',
        notes: ''
      });
      loadMeasurements();
    } catch (error) {
      console.error('Failed to add measurement:', error);
      toast.error('Failed to add measurement');
    }
  };

  const deleteMeasurement = async (id) => {
    if (confirm('Delete this measurement?')) {
      try {
        await base44.entities.BodyMeasurement.delete(id);
        toast.success('Measurement deleted');
        loadMeasurements();
      } catch (error) {
        console.error('Failed to delete:', error);
        toast.error('Failed to delete measurement');
      }
    }
  };

  const getChartData = () => {
    return measurements
      .slice()
      .reverse()
      .map(m => ({
        date: format(new Date(m.date), 'MMM d'),
        weight: m.weight_lbs || null,
        waist: m.waist_inches || null,
        chest: m.chest_inches || null
      }));
  };

  const latestMeasurement = measurements[0];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Mobile Header with Back Button */}
      <div className="md:hidden sticky top-0 z-40 bg-[#0a1628]/95 backdrop-blur-lg border-b border-brand-blue/30 px-4 py-3 select-none">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="text-white hover:text-brand-blue flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold truncate">Body Measurements</h1>
            <p className="text-xs text-white/70">Track your progress</p>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Body Measurements</h1>
          <p className="text-white/90">Track your physical progress over time</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Latest Stats */}
        {latestMeasurement && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {latestMeasurement.weight_lbs && (
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-brand-blue">{latestMeasurement.weight_lbs}</div>
                  <div className="text-sm text-gray-400">Weight (lbs)</div>
                </CardContent>
              </Card>
            )}
            {latestMeasurement.body_fat_percentage && (
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{latestMeasurement.body_fat_percentage}%</div>
                  <div className="text-sm text-gray-400">Body Fat</div>
                </CardContent>
              </Card>
            )}
            {latestMeasurement.waist_inches && (
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{latestMeasurement.waist_inches}"</div>
                  <div className="text-sm text-gray-400">Waist</div>
                </CardContent>
              </Card>
            )}
            {latestMeasurement.chest_inches && (
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">{latestMeasurement.chest_inches}"</div>
                  <div className="text-sm text-gray-400">Chest</div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Progress Charts */}
        {measurements.length > 1 && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-blue" />
                Progress Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#f9fafb' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="#00a9ff" strokeWidth={2} name="Weight (lbs)" />
                  <Line type="monotone" dataKey="waist" stroke="#a855f7" strokeWidth={2} name="Waist (in)" />
                  <Line type="monotone" dataKey="chest" stroke="#f97316" strokeWidth={2} name="Chest (in)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Add Measurement Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gradient-bg hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? 'Cancel' : 'Add New Measurement'}
          </Button>
        </div>

        {/* Measurement Form */}
        {showForm && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle>New Measurement</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Weight (lbs)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight_lbs}
                      onChange={(e) => setFormData({...formData, weight_lbs: e.target.value})}
                      placeholder="e.g., 175.5"
                    />
                  </div>
                  <div>
                    <Label>Body Fat %</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.body_fat_percentage}
                      onChange={(e) => setFormData({...formData, body_fat_percentage: e.target.value})}
                      placeholder="e.g., 18.5"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Chest (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.chest_inches}
                      onChange={(e) => setFormData({...formData, chest_inches: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Waist (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.waist_inches}
                      onChange={(e) => setFormData({...formData, waist_inches: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Hips (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.hips_inches}
                      onChange={(e) => setFormData({...formData, hips_inches: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Left Bicep (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.bicep_left_inches}
                      onChange={(e) => setFormData({...formData, bicep_left_inches: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Right Bicep (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.bicep_right_inches}
                      onChange={(e) => setFormData({...formData, bicep_right_inches: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Left Thigh (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.thigh_left_inches}
                      onChange={(e) => setFormData({...formData, thigh_left_inches: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Right Thigh (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.thigh_right_inches}
                      onChange={(e) => setFormData({...formData, thigh_right_inches: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Left Calf (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.calf_left_inches}
                      onChange={(e) => setFormData({...formData, calf_left_inches: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Right Calf (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.calf_right_inches}
                      onChange={(e) => setFormData({...formData, calf_right_inches: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any notes about this measurement..."
                  />
                </div>

                <Button type="submit" className="gradient-bg">
                  Save Measurement
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Measurement History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="w-5 h-5" />
              Measurement History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : measurements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No measurements yet. Add your first one above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {measurements.map((measurement) => (
                  <div key={measurement.id} className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-blue" />
                        <span className="font-semibold">{format(new Date(measurement.date), 'MMMM d, yyyy')}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMeasurement(measurement.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {measurement.weight_lbs && (
                        <div>
                          <span className="text-gray-400">Weight:</span>
                          <span className="ml-2 font-medium">{measurement.weight_lbs} lbs</span>
                        </div>
                      )}
                      {measurement.body_fat_percentage && (
                        <div>
                          <span className="text-gray-400">Body Fat:</span>
                          <span className="ml-2 font-medium">{measurement.body_fat_percentage}%</span>
                        </div>
                      )}
                      {measurement.chest_inches && (
                        <div>
                          <span className="text-gray-400">Chest:</span>
                          <span className="ml-2 font-medium">{measurement.chest_inches}"</span>
                        </div>
                      )}
                      {measurement.waist_inches && (
                        <div>
                          <span className="text-gray-400">Waist:</span>
                          <span className="ml-2 font-medium">{measurement.waist_inches}"</span>
                        </div>
                      )}
                      {measurement.hips_inches && (
                        <div>
                          <span className="text-gray-400">Hips:</span>
                          <span className="ml-2 font-medium">{measurement.hips_inches}"</span>
                        </div>
                      )}
                      {measurement.bicep_left_inches && (
                        <div>
                          <span className="text-gray-400">L Bicep:</span>
                          <span className="ml-2 font-medium">{measurement.bicep_left_inches}"</span>
                        </div>
                      )}
                      {measurement.bicep_right_inches && (
                        <div>
                          <span className="text-gray-400">R Bicep:</span>
                          <span className="ml-2 font-medium">{measurement.bicep_right_inches}"</span>
                        </div>
                      )}
                    </div>
                    
                    {measurement.notes && (
                      <div className="mt-3 text-sm text-gray-400 italic">
                        {measurement.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}