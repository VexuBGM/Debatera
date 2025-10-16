import { OwnCapability, Restricted } from '@stream-io/video-react-sdk';
import {
  ReactionsButton,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  CancelCallButton,
} from '@stream-io/video-react-sdk';

const GRANT_SEND_AUDIO: OwnCapability[] = [OwnCapability.SEND_AUDIO];
const GRANT_SEND_VIDEO: OwnCapability[] = [OwnCapability.SEND_VIDEO];
const GRANT_CREATE_REACTION: OwnCapability[] = [OwnCapability.CREATE_REACTION];

export default function CustomCallControls({ onLeave }: { onLeave?: () => void }) {
  return (
    <div className="str-video__call-controls">
      <Restricted requiredGrants={GRANT_SEND_AUDIO}>
        <ToggleAudioPublishingButton
          Menu={() => null}
          menuPlacement="bottom"
          onMenuToggle={() => {}}
        />
      </Restricted>
      <Restricted requiredGrants={GRANT_SEND_VIDEO}>
        <ToggleVideoPublishingButton
          Menu={() => null}
          menuPlacement="bottom"
          onMenuToggle={() => {}}
        />
      </Restricted>
      <Restricted requiredGrants={GRANT_CREATE_REACTION}>
        <ReactionsButton />
      </Restricted>
      <CancelCallButton onLeave={onLeave} />
    </div>
  );
}
