import { NextFunction, Request, Response } from 'express';
import { userProfileService } from '../services/user-profile.service';
export class UserProfileController {
  private userId(req: Request) { if (!req.user?.userId) throw new Error('Authentication required'); return req.user.userId; }
  mine = async (req:Request,res:Response,next:NextFunction) => { try { res.json({success:true,data:await userProfileService.getMine(this.userId(req))}); } catch(error){ next(error); } };
  save = async (req:Request,res:Response,next:NextFunction) => { try { res.json({success:true,data:await userProfileService.save(this.userId(req),req.body||{})}); } catch(error){ next(error); } };
  publish = async (req:Request,res:Response,next:NextFunction) => { try { res.json({success:true,data:await userProfileService.publish(this.userId(req))}); } catch(error){ next(error); } };
  unpublish = async (req:Request,res:Response,next:NextFunction) => { try { res.json({success:true,data:await userProfileService.unpublish(this.userId(req))}); } catch(error){ next(error); } };
  public = async (req:Request,res:Response,next:NextFunction) => { try { res.json({success:true,data:await userProfileService.getPublic(req.params.handle)}); } catch(error){ next(error); } };
}
