import { NetflixAdapter } from './netflix-adapter.js';
import { PLATFORMS } from '../shared/constants.js';

export class AdapterFactory {
  static create(platform) {
    switch (platform) {
      case PLATFORMS.NETFLIX:
        return new NetflixAdapter();
      case PLATFORMS.YOUTUBE:
        // TODO: Implement YouTube adapter
        console.log('YouTube adapter not yet implemented, using Netflix adapter as fallback');
        return new NetflixAdapter();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}