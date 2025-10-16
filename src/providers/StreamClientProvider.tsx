"use client";

import { StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { tokenProvider } from "@/actions/stream.actions";
import Loader from "@/components/Loader";

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

const StreamVideoProvider = ({ children }: { children: React.ReactNode }) => {
  const [videoClient, setVideoClient] = useState<StreamVideoClient>();
  const { user, isLoaded } = useUser();

  const streamUser = useMemo(() => {
    if (!user) return undefined;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    const email = user.primaryEmailAddress?.emailAddress;
    return {
      id: user.id,
      name: user.username || fullName || email || user.id,
      image: user.imageUrl || undefined,
    };
  }, [
    user?.id,
    user?.username,
    user?.firstName,
    user?.lastName,
    user?.imageUrl,
    user?.primaryEmailAddress?.emailAddress,
  ]);

  useEffect(() => {
    if (!isLoaded || !streamUser) return;

    const client = new StreamVideoClient({
      apiKey,
      user: streamUser,
      tokenProvider,
    });

    setVideoClient(client);

    return () => {
      // Cleanly disconnect this user when the provider unmounts or user changes
      client.disconnectUser?.();
    };
  }, [isLoaded, streamUser]);

  if (!videoClient) return <Loader />;

  return <StreamVideo client={videoClient}>{children}</StreamVideo>;
};

export default StreamVideoProvider;
