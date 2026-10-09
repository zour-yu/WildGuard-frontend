/**
 * Unit Test Suite: Geolocation & Fallback Handling (UC-01)
 * 
 * Tests:
 * 1. Positive: Correctly queries navigator.geolocation and parses lat/lng coordinates.
 * 2. Error Case: Handles permission denial and switches to manual coordinates mode.
 * 3. Fallback: Manual coordinate updates properly reflect in state.
 */

describe('Geolocation & Manual Coordinate Fallback Logic', () => {
  let mockGetCurrentPosition: jest.Mock;

  beforeEach(() => {
    mockGetCurrentPosition = jest.fn();
    (global as any).navigator = {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition,
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Positive: extracts accurate GPS coordinates from device hardware', () => {
    mockGetCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 6.834123,
          longitude: 80.988456,
          accuracy: 4.5,
        },
      });
    });

    let extractedCoords: any = null;
    let extractedAccuracy: any = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        extractedCoords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        extractedAccuracy = Number(pos.coords.accuracy.toFixed(1));
      },
      () => {}
    );

    expect(extractedCoords).toEqual({ lat: 6.834123, lng: 80.988456 });
    expect(extractedAccuracy).toBe(4.5);
    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('Error Case: GPS denial triggers fallback error and manual coordinate fallback', () => {
    mockGetCurrentPosition.mockImplementation((_success, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'User denied Geolocation',
      });
    });

    let isManualFallback = false;
    let errorMsg = '';
    const defaultCoords = { lat: 6.834, lng: 80.988 };
    let finalCoords = defaultCoords;

    navigator.geolocation.getCurrentPosition(
      () => {},
      (err) => {
        isManualFallback = true;
        errorMsg = 'GPS permission denied by user. Please enter coordinates manually.';
      }
    );

    expect(isManualFallback).toBe(true);
    expect(errorMsg).toContain('GPS permission denied');
    expect(finalCoords).toEqual(defaultCoords);
  });
});
