import { useEffect, useState } from "react";
import { Call, useStreamVideoClient } from "@stream-io/video-react-sdk";

export const useGetCallByID = (id: string | string[] | undefined) => {
  const [call, setCall] = useState<Call>();
  const [isCallLoading, setIsCallLoading] = useState(true);

  const client = useStreamVideoClient();

  useEffect(() => {
    let mounted = true;
    const loadCall = async () => {
      if (!client || !id) {
        setIsCallLoading(false);
        return;
      }

      try {
        // First try to query for existing call
        const { calls } = await client.queryCalls({
          filter_conditions: { id },
        });
        
        if (!mounted) return;
        
        if (calls.length > 0) {
          setCall(calls[0]);
        } else {
          // Call doesn't exist, create it
          const newCall = client.call('default', id as string);
          await newCall.getOrCreate();
          if (mounted) {
            setCall(newCall);
          }
        }
      } catch (err) {
        console.error('Failed to load or create call', err);
      } finally {
        if (mounted) setIsCallLoading(false);
      }
    };

    loadCall();

    return () => {
      mounted = false;
    };
  }, [client, id]);

  return { call, isCallLoading };
} 