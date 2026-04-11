export type TourStepPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  /**
   * The value of the `data-tour` attribute on the target element.
   * When omitted or set to 'center', the tooltip renders centered on screen.
   */
  target?: string;
  position?: TourStepPosition;
}

export interface TourConfig {
  id: string;
  steps: TourStep[];
}
