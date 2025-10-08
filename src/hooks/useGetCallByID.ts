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
        const { calls } = await client.queryCalls({
          filter_conditions: { id },
        });
        if (!mounted) return;
        if (calls.length > 0) setCall(calls[0]);
      } catch (err) {
        console.error('Failed to load call', err);
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