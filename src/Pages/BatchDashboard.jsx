import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useUser } from "@/components/Contexts/userContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Users, 
  Layers, 
  ChevronDown,
  Sparkles,
  School,
  PowerOff,
  XCircle,
  Power,
  RefreshCw
} from "lucide-react";

const sessionRegex = /^\d{4}\/\d{4}$/;

const BatchDashboard = () => {
  const { userData } = useUser();

  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [classes, setClasses] = useState([]);
  const [session, setSession] = useState("");
  const [massLoading, setMassLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [deactivatingBatch, setDeactivatingBatch] = useState(null);
  const [reactivatingBatch, setReactivatingBatch] = useState(null); // NEW: Track reactivation loading

  // ===============================
  // 🔹 Fetch proprietor schools
  // ===============================
  useEffect(() => {
    const fetchSchools = async () => {
      if (!userData?.user_id) return;

      const { data, error } = await supabase
        .from("schools")
        .select("id, name")
        .eq("school_owner", userData.user_id)
        .eq("is_deleted", false);

      if (error) {
        console.error("Failed to load schools:", error);
        toast.error("Failed to load schools");
        return;
      }

      setSchools(data || []);

      if (data?.length === 1) {
        setSelectedSchool(String(data[0].id));
      }
    };

    fetchSchools();
  }, [userData]);

  // ===============================
  // 🔹 Fetch ALL classes with batch status for selected school
  // ===============================
  const fetchClassesWithStatus = useCallback(async () => {
    if (!selectedSchool || !sessionRegex.test(session)) {
      setClasses([]);
      return;
    }

    setIsValidating(true);
    
    // Get all batches for this school/session to check active/inactive status
    const { data: batchesData, error: batchesError } = await supabase
      .from("batches")
      .select("batch_id, class_id, batch_name, is_active, created_at")
      .eq("school_id", parseInt(selectedSchool))
      .eq("batch_name", session)
      .order("created_at", { ascending: false });

    if (batchesError) {
      console.error("Failed to load batches:", batchesError);
      toast.error("Failed to load batches");
      setClasses([]);
      setIsValidating(false);
      return;
    }

    // Get all classes
    const { data: classesData, error: classesError } = await supabase
      .from("class")
      .select("class_id, class_name")
      .order("class_name");

    if (classesError) {
      console.error("Failed to load classes:", classesError);
      toast.error("Failed to load classes");
      setClasses([]);
      setIsValidating(false);
      return;
    }

    // Merge classes with batch data
    const mergedClasses = classesData.map(cls => {
      const classBatches = batchesData?.filter(b => b.class_id === cls.class_id) || [];
      const activeBatch = classBatches.find(b => b.is_active);
      const inactiveBatches = classBatches.filter(b => !b.is_active);
      
      // NEW: Get the most recent inactive batch for reactivation
      const mostRecentInactive = inactiveBatches.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0];

      return {
        ...cls,
        batch_exists: !!activeBatch,
        batch_id: activeBatch?.batch_id || null,
        is_active: activeBatch?.is_active || false,
        has_inactive: inactiveBatches.length > 0,
        inactive_count: inactiveBatches.length,
        all_batches: classBatches,
        most_recent_inactive_batch_id: mostRecentInactive?.batch_id || null // NEW: For reactivation
      };
    });

    setClasses(mergedClasses);
    setIsValidating(false);
  }, [selectedSchool, session]);

  useEffect(() => {
    fetchClassesWithStatus();
  }, [fetchClassesWithStatus]);

  // ===============================
  // 🔹 Mass batch creation with auto-deactivation
  // ===============================
  const handleMassCreate = async () => {
    if (!selectedSchool || !session) {
      toast.error("Select school and batch name");
      return;
    }

    if (!sessionRegex.test(session)) {
      toast.error("Batch name must be in format YYYY/YYYY");
      return;
    }

    const eligibleClasses = classes.filter(c => !c.batch_exists);
    
    if (eligibleClasses.length === 0) {
      toast.info("All classes already have active batches for this session");
      return;
    }

    setMassLoading(true);

    try {
      // Step 1: Deactivate all existing active batches for this school/session
      const classesWithActiveBatches = classes.filter(c => c.batch_exists && c.batch_id);
      
      if (classesWithActiveBatches.length > 0) {
        toast.info(`Deactivating ${classesWithActiveBatches.length} existing batches...`);
        
        for (const cls of classesWithActiveBatches) {
          const { error: deactivateError } = await supabase
            .from("batches")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("batch_id", cls.batch_id);

          if (deactivateError) {
            console.error(`Failed to deactivate batch for ${cls.class_name}:`, deactivateError);
          }
        }
      }

      // Step 2: Create new batches via RPC
      const { data, error } = await supabase.rpc("mass_create_batches", {
        p_school_id: parseInt(selectedSchool),
        p_batch_name: session,
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error);
        return;
      }

      if (data.inserted > 0) {
        toast.success(`Created ${data.inserted} new batches. Previous batches deactivated.`);
      }
      
      if (data.skipped > 0) {
        toast.info(`Skipped ${data.skipped} classes`);
      }
      
      if (data.errors?.length > 0) {
        console.warn("Batch creation errors:", data.errors);
      }

      await fetchClassesWithStatus();
      
    } catch (error) {
      console.error("Mass creation error:", error);
      toast.error(error.message || "Mass batch creation failed");
    } finally {
      setMassLoading(false);
    }
  };

  // ===============================
  // 🔹 Manual deactivate (for individual control)
  // ===============================
  const handleDeactivateBatch = async (classId, batchId, className) => {
    if (!confirm(`Deactivate batch for ${className}? Students will remain enrolled but no new promotions will be allowed.`)) {
      return;
    }

    setDeactivatingBatch(classId);

    try {
      const { error } = await supabase
        .from("batches")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("batch_id", batchId)
        .eq("school_id", parseInt(selectedSchool));

      if (error) throw error;

      toast.success(`Batch for ${className} deactivated`);
      await fetchClassesWithStatus();
      
    } catch (error) {
      console.error("Deactivation error:", error);
      toast.error(error.message || "Failed to deactivate batch");
    } finally {
      setDeactivatingBatch(null);
    }
  };

  // ===============================
  // 🔹 NEW: Reactivate batch
  // ===============================
  const handleReactivateBatch = async (classId, batchId, className) => {
    if (!confirm(`Reactivate batch for ${className}? This will allow promotions for this class again.`)) {
      return;
    }

    setReactivatingBatch(classId);

    try {
      // First deactivate any currently active batch for this class to avoid unique constraint violation
      const { error: deactivateError } = await supabase
        .from("batches")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("school_id", parseInt(selectedSchool))
        .eq("class_id", classId)
        .eq("is_active", true);

      if (deactivateError) {
        console.error("Error deactivating current batch:", deactivateError);
      }

      // Now reactivate the selected batch
      const { error } = await supabase
        .from("batches")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("batch_id", batchId)
        .eq("school_id", parseInt(selectedSchool));

      if (error) throw error;

      toast.success(`Batch for ${className} reactivated`);
      await fetchClassesWithStatus();
      
    } catch (error) {
      console.error("Reactivation error:", error);
      toast.error(error.message || "Failed to reactivate batch");
    } finally {
      setReactivatingBatch(null);
    }
  };

  const existingCount = classes.filter(c => c.batch_exists).length;
  const inactiveCount = classes.filter(c => c.has_inactive).length;
  const newCount = classes.filter(c => !c.batch_exists).length;
  const isSessionValid = sessionRegex.test(session);
  const progress = classes.length > 0 ? (existingCount / classes.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg shadow-violet-200 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
            Batch Management
          </h1>
          <p className="text-gray-500">Create and manage academic batches for your institution</p>
        </div>

        {/* Configuration Card */}
        <Card className="border-0 shadow-xl shadow-gray-100/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500" />
          <CardContent className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-100 to-blue-100">
                <School className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Configuration</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* School Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Institution</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    value={selectedSchool}
                    onChange={(e) => {
                      setSelectedSchool(e.target.value);
                    }}
                  >
                    <option value="">Select School</option>
                    {schools.map((sch) => (
                      <option key={sch.id} value={sch.id}>
                        {sch.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Session Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Academic Session</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="2026/2027"
                    className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none transition-all ${
                      session && !isSessionValid 
                        ? "border-red-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500" 
                        : "border-gray-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    }`}
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                  />
                  {session && isSessionValid && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
                {session && !isSessionValid && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Format: YYYY/YYYY
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {selectedSchool && isSessionValid && classes.length > 0 && (
              <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Batch Coverage</span>
                  <span className="text-gray-500">{Math.round(progress)}% Active</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-gray-600">{existingCount} Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-gray-600">{inactiveCount} Inactive</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-gray-600">{newCount} Missing</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Class List with Batch Status - NOW SHOWS INACTIVE IN RED WITH REACTIVATE BUTTON */}
        {selectedSchool && isSessionValid && classes.length > 0 && (
          <Card className="border-0 shadow-xl shadow-gray-100/50 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-violet-500" />
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-violet-100">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Class Batches</h2>
              </div>

              <div className="grid gap-3">
                {classes.map((cls) => {
                  // Determine status styling
                  let statusColor = "border-gray-200 bg-gray-50/50"; // no batch
                  let iconColor = "bg-gray-100 text-gray-400";
                  let statusText = "No batch created";
                  let StatusIcon = () => <span className="text-lg font-bold">{cls.class_name.charAt(0)}</span>;
                  
                  if (cls.batch_exists && cls.is_active) {
                    // Active batch - GREEN
                    statusColor = "border-green-200 bg-green-50/50";
                    iconColor = "bg-green-100 text-green-600";
                    statusText = "Batch active";
                    StatusIcon = () => <CheckCircle2 className="w-6 h-6" />;
                  } else if (cls.has_inactive) {
                    // Has inactive batch(es) - RED
                    statusColor = "border-red-200 bg-red-50/50";
                    iconColor = "bg-red-100 text-red-600";
                    statusText = `${cls.inactive_count} inactive batch${cls.inactive_count > 1 ? 'es' : ''}`;
                    StatusIcon = () => <XCircle className="w-6 h-6" />;
                  }

                  return (
                    <div 
                      key={cls.class_id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${statusColor}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}>
                          <StatusIcon />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{cls.class_name}</h3>
                          <p className={`text-sm flex items-center gap-1 ${
                            cls.has_inactive ? 'text-red-600' : 
                            cls.batch_exists ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {cls.has_inactive ? <XCircle className="w-3 h-3" /> : 
                             cls.batch_exists ? <CheckCircle2 className="w-3 h-3" /> : null}
                            {statusText}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {/* Show reactivate button for inactive batches */}
                        {cls.has_inactive && cls.most_recent_inactive_batch_id && !cls.batch_exists && (
                          <Button
                            onClick={() => handleReactivateBatch(cls.class_id, cls.most_recent_inactive_batch_id, cls.class_name)}
                            disabled={reactivatingBatch === cls.class_id}
                            variant="outline"
                            size="sm"
                            className="border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                          >
                            {reactivatingBatch === cls.class_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reactivate
                              </>
                            )}
                          </Button>
                        )}

                        {/* Show deactivate button only for active batches */}
                        {cls.batch_exists && cls.is_active && cls.batch_id && (
                          <Button
                            onClick={() => handleDeactivateBatch(cls.class_id, cls.batch_id, cls.class_name)}
                            disabled={deactivatingBatch === cls.class_id}
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            {deactivatingBatch === cls.class_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <PowerOff className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mass Create Action - AUTO DEACTIVATES OLD BATCHES */}
        {selectedSchool && isSessionValid && (
          <Card className="border-0 shadow-lg shadow-gray-100/50 hover:shadow-xl transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-200/30 to-purple-200/30 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <CardContent className="p-6 space-y-4 relative">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-200">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Mass Creation</h3>
                  <p className="text-xs text-gray-500">
                    Creates new batches and auto-deactivates old ones
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-4 border border-violet-100">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-violet-600 mt-0.5" />
                  <div className="space-y-1">
                    {newCount > 0 ? (
                      <p className="text-sm font-medium text-gray-800">
                        Will create {newCount} new batches
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-gray-800">
                        All classes have batches
                      </p>
                    )}
                    {existingCount > 0 && (
                      <p className="text-xs text-red-600 font-medium">
                        ⚠️ {existingCount} existing active batches will be deactivated
                      </p>
                    )}
                    {inactiveCount > 0 && (
                      <p className="text-xs text-gray-500">
                        {inactiveCount} classes already have inactive batches
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleMassCreate}
                disabled={massLoading || isValidating || newCount === 0}
                className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {massLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Layers className="w-4 h-4 mr-2" />
                    {newCount > 0 ? `Create ${newCount} Batches` : "All Batches Created"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Footer */}
        {selectedSchool && isSessionValid && (
          <div className="flex justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span>{existingCount} Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <span>{inactiveCount} Inactive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span>{classes.length} Total Classes</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchDashboard;