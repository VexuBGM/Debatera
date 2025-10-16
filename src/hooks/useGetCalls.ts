import { useEffect, useState } from "react";
import { Call, useStreamVideoClient } from "@stream-io/video-react-sdk";

export const useGetCalls = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const client = useStreamVideoClient();

  useEffect(() => {
    let mounted = true;
    const loadCalls = async () => {
      if (!client) {
        setIsLoading(false);
        return;
      }

      try {
        // Query for all calls, sorted by start time (newest first)
        const { calls } = await client.queryCalls({
          sort: [{ field: 'starts_at', direction: -1 }],
          limit: 50,
        });
        
        if (!mounted) return;
        setCalls(calls || []);
      } catch (err) {
        console.error('Failed to load calls', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadCalls();

    return () => {
      mounted = false;
    };
  }, [client]);

  return { calls, isLoading };
};
