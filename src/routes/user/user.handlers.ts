import { getUserSettings as getUserSettingsService } from '../../services/user.service.js';

export const getUserSettings = async (req: any, res: any): Promise<any> => {
    try {
        const { token } = req;
        const settings = await getUserSettingsService(token);
        return res.status(200).json(settings);
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message });
    }
}
